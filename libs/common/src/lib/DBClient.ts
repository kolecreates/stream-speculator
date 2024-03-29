/* eslint-disable max-classes-per-file */
import faunadb, { query as q } from 'faunadb';
import { StreamMetricType } from './types';

class DBCollection {
  constructor(public readonly name: string) {}

  doc(id: string) : faunadb.Expr {
    return q.Ref(this.ref(), id);
  }

  ref() : faunadb.Expr {
    return q.Collection(this.name);
  }

  with(field: string, value: any) : faunadb.Expr {
    return q.Match(q.Index(`${this.name}_by_${field}`), value);
  }

  withMulti(items: { field: string, value: any }[]) : faunadb.Expr {
    const indexName = `${this.name}_by_${items.map((i) => i.field).join('_')}`;
    return q.Match(q.Index(indexName), ...items.map((i) => i.value));
  }

  withRefsTo(refs: { collection: DBCollection, id: string }[]) : faunadb.Expr {
    const fields = refs.map((ref) => {
      let field = ref.collection.name.toLowerCase();
      field = field.substring(0, field.length - 1);
      field = `${field}Ref`;
      return field;
    });

    const indexName = `${this.name}_by_${fields.join('_')}`;

    return q.Match(q.Index(indexName), ...refs.map((ref) => ref.collection.doc(ref.id)));
  }

  fieldExists(field: string) : faunadb.Expr {
    return q.Filter(q.Documents(this.ref()), q.Lambda('ref', q.Not(q.IsNull(q.Select(['data', field], q.Get(q.Var('ref')))))));
  }

  expireAfter(time: faunadb.Expr) : faunadb.Expr {
    return q.Filter(
      q.Documents(this.ref()),
      q.Lambda('ref',
        q.GT(
          q.Select(['ttl'], q.Get(q.Var('ref'))),
          time,
        )),
    );
  }
}
type FaunaCursor = any;

export type FaunaRef = { id: string; };

export type FaunaDoc = {
  ref: FaunaRef;
  data: any;
  ttl?: number;
};

export type FaunaPage<T> = {
  after?: FaunaCursor;
  data: T[];
};

export type FaunaDocCreate = {
  created: boolean;
  doc: FaunaDoc;
};

export type FaunaTokenDoc = {
  ref: FaunaRef;
  instance: FaunaRef;
  ts: number;
  secret: string;
};

export type FaunaStreamData = {
  document: FaunaDoc;
  action?: 'update' | 'delete',
};

export type FaunaDocEvent<T> = {
  ts: number;
  action: string;
  document: FaunaRef;
  data: T;
};

export class DBClient {
  static readonly channels: DBCollection = new DBCollection('Channels');

  static readonly users: DBCollection = new DBCollection('Users');

  static readonly scheduledTasks: DBCollection = new DBCollection('ScheduledTasks');

  static readonly accessTokens: DBCollection = new DBCollection('TwitchClientAccessTokens');

  static readonly streamMetrics: DBCollection = new DBCollection('StreamMetrics');

  static readonly webhookSubs: DBCollection = new DBCollection('TwitchWebhookSubs');

  static readonly predictions: DBCollection = new DBCollection('Predictions');

  static readonly bets: DBCollection = new DBCollection('Bets');

  static readonly outcomes: DBCollection = new DBCollection('Outcomes');

  private client: faunadb.Client;

  constructor(secret: string) {
    this.client = new faunadb.Client({
      secret,
    });
  }

  static collection(name: string) : DBCollection {
    return new DBCollection(name);
  }

  static named(shape: { [key: string] : faunadb.Expr }) : faunadb.Expr {
    const gets: { [key: string] : faunadb.Expr } = {};
    const sets: { [key: string] : faunadb.Expr } = {};
    Object.keys(shape).forEach((k) => {
      gets[k] = shape[k];
      sets[k] = q.Var(k);
    });
    return q.Let(gets, sets);
  }

  static useVar(varName: string) : faunadb.Expr {
    return q.Var(varName);
  }

  static defineVars(vars: { [key: string] : faunadb.ExprArg }, usage: faunadb.Expr) : faunadb.Expr {
    return q.Let(vars, usage);
  }

  static get(expr: faunadb.Expr) : faunadb.Expr {
    return q.Get(expr);
  }

  static getIfMatch(expr: faunadb.Expr) :faunadb.Expr {
    return q.Let(
      { list: expr },
      q.If(
        q.IsEmpty(q.Var('list')),
        null,
        q.Get(q.Var('list')),
      ),
    );
  }

  static getExists(expr: faunadb.Expr) :faunadb.Expr {
    return q.Let(
      { ref: expr },
      q.If(
        q.Exists(q.Var('ref')),
        q.Get(q.Var('ref')),
        null,
      ),
    );
  }

  static deRef<T>(doc: FaunaDoc) : T {
    const data: any = {};
    Object.keys(doc.data).forEach((k) => {
      if (k.indexOf('Ref') > -1) {
        data[`${k.split('Ref')[0]}Id`] = doc.data[k].id;
      } else {
        data[k] = doc.data[k];
      }
    });
    return { id: doc.ref.id, ...data };
  }

  static deRefPage<T>(page: FaunaPage<FaunaDoc>) : T[] {
    return page.data.map((doc) => this.deRef<T>(doc));
  }

  static refify(data: { [key: string]: any }) : { [key: string] : any } {
    const docData: any = {};
    Object.keys(data).forEach((k) => {
      if (k.indexOf('Id') > -1 && k.charAt(0) !== '_') {
        const collectionSingular = k.split('Id')[0];
        let collectionPlural = `${collectionSingular}s`;
        collectionPlural = collectionPlural.charAt(0).toUpperCase() + collectionPlural.slice(1);
        docData[`${collectionSingular}Ref`] = q.Ref(q.Collection(collectionPlural), data[k]);
      } else if (k.charAt(0) === '_') {
        const s = k.slice(1);
        docData[s] = data[k];
      } else {
        docData[k] = data[k];
      }
    });
    return docData;
  }

  static deRefNamed<T>(docs: { [key: string]: FaunaDoc }) : T {
    return Object.keys(docs).reduce((map: any, key) => {
      // eslint-disable-next-line no-param-reassign
      map[key] = this.deRef(docs[key]);
      return map;
    }, {});
  }

  static fromNow(offset: number, unit: 'days' | 'seconds' | 'hours') : faunadb.Expr {
    return q.TimeAdd(q.Now(), offset, unit);
  }

  static fromDate(date: Date) : faunadb.Expr {
    return q.Time(date.toISOString());
  }

  static create<T extends { [key: string] : any }>(collection: DBCollection,
    data: T, ttl?: faunadb.Expr) : faunadb.Expr {
    if (data.id) {
      const ref = collection.doc(data.id);
      return q.If(q.Exists(ref),
        { created: false, doc: q.Get(ref) },
        { created: true, doc: q.Create(ref, { data: this.refify(data), ttl }) });
    }
    return q.Create(collection.ref(), { data: this.refify(data), ttl });
  }

  static token(docRef: faunadb.Expr, ttl: faunadb.Expr) : faunadb.Expr {
    return q.Create(q.Tokens(), { instance: docRef, ttl });
  }

  static batch(...exprs: faunadb.Expr[]) : faunadb.Expr {
    return q.Do(...exprs);
  }

  static varToRef(varName: string) : faunadb.Expr {
    return q.Select(['ref'], q.Var(varName));
  }

  static varSelect(varName: string, path: string[], fallback?: faunadb.ExprArg) : faunadb.Expr {
    return q.Select(path, q.Var(varName), fallback);
  }

  static getField(ref: faunadb.Expr, fieldName: string) : faunadb.Expr {
    return q.Select(['data', fieldName], q.Get(ref));
  }

  static add(a: faunadb.ExprArg, b: faunadb.ExprArg) : faunadb.Expr {
    return q.Add(a, b);
  }

  static count(set: faunadb.Expr) : faunadb.Expr {
    return q.Count(set);
  }

  static merge(a: faunadb.ExprArg, b: faunadb.ExprArg) : faunadb.Expr {
    return q.Merge(a, b);
  }

  static delete(ref: faunadb.Expr) : faunadb.Expr {
    return q.Delete(ref);
  }

  static deleteExists(ref:faunadb.Expr) : faunadb.Expr {
    return q.If(q.Exists(ref), q.Delete(ref), null);
  }

  static update(ref: faunadb.Expr, data: any) : faunadb.Expr {
    return q.Update(ref, { data });
  }

  static streamMetric(channelId: string, type: StreamMetricType) : faunadb.Expr {
    return this.streamMetrics.doc(`${channelId}${type.toString()}`);
  }

  static updateOrCreate(ref: faunadb.Expr, data: any) : faunadb.Expr {
    const refified = this.refify(data);
    return q.If(q.Exists(ref),
      q.Do(this.update(ref, refified), false),
      q.Do(q.Create(ref, { data: refified }), true));
  }

  static pageOfEvents(ref: faunadb.Expr, maxAgeMs: number) : faunadb.Expr {
    return q.Map(
      q.Paginate(ref, { events: true, after: q.TimeSubtract(q.Now(), maxAgeMs, 'milliseconds') }),
      q.Lambda('doc', q.Select(['data'], q.Var('doc'))),
    );
  }

  static updateUserCoins(userId: string, delta: number) : faunadb.Expr {
    const ref = this.users.doc(userId);
    return q.Update(ref, {
      data: {
        coins: q.Add(
          q.Select(
            ['data', 'coins'],
            q.Get(ref),
          ),
          delta,
        ),
      },
    });
  }

  static addToDocFields(ref: faunadb.Expr, adds: { [key: string]: faunadb.ExprArg })
    : faunadb.Expr {
    const update: { [key: string]: faunadb.ExprArg } = {};

    Object.keys(adds).forEach((key) => {
      update[key] = q.Add(
        q.Select(['data', key], q.Var('fieldsDoc'), 0),
        adds[key],
      );
    });
    return q.Let({
      fieldsDoc: q.Get(ref),
    }, q.Update(ref, {
      data: update,
    }));
  }

  static ifMultipleOf(
    value: faunadb.Expr,
    of: faunadb.ExprArg,
    ifTrue: faunadb.ExprArg | null, ifFalse: faunadb.ExprArg | null,
  ) : faunadb.Expr {
    return q.If(
      q.And(q.Not(q.Equals(value, 0)), q.Equals(q.Modulo(value, of), 0)),
      ifTrue,
      ifFalse,
    );
  }

  static userCoinPurchase(userId: string, cost: number, operation: faunadb.Expr)
    : faunadb.Expr {
    const ref = this.users.doc(userId);
    return q.Let({
      coins: q.Select(
        ['data', 'coins'],
        q.Get(ref),
      ),
    }, q.If(
      q.GTE(
        q.Var('coins'),
        cost,
      ),
      q.Do(
        q.Update(ref, { data: { coins: q.Subtract(q.Var('coins'), cost) } }),
        operation,
      ),
      null,
    ));
  }

  static ifFieldTrue(ref: faunadb.Expr, field: string, trueExpr: faunadb.Expr,
    falseExpr: faunadb.Expr | null) : faunadb.Expr {
    return q.If(
      q.And(q.Exists(ref), q.Equals(q.Select(['data', field], q.Get(ref)), true)),
      trueExpr,
      falseExpr,
    );
  }

  static ifTrueSetFalse(ref: faunadb.Expr, field: string) : faunadb.Expr {
    return q.If(
      q.Equals(
        q.Select(['data', field], q.Get(ref)),
        true,
      ),
      q.Do(
        q.Update(ref, { data: { [field]: false } }),
        true,
      ),
      false,
    );
  }

  static ifFieldGTE(
    ref: faunadb.Expr,
    field: string,
    value: faunadb.ExprArg,
    trueExpr: faunadb.Expr,
    falseExpr: faunadb.Expr | null,
  ) {
    return q.If(
      q.Exists(ref),
      q.Let({
        fieldDoc: q.Get(ref),
      },
      q.If(
        q.GTE(q.Select(['data', field], q.Var('fieldDoc')), value),
        trueExpr,
        falseExpr,
      )),
      null,
    );
  }

  static ifFieldEqual(
    ref: faunadb.Expr,
    field: string,
    value: faunadb.ExprArg,
    trueExpr: faunadb.Expr,
    falseExpr: faunadb.Expr | null,
  ) {
    return q.If(
      q.Exists(ref),
      q.Let({
        fieldDoc: q.Get(ref),
      },
      q.If(
        q.Equals(q.Select(['data', field], q.Var('fieldDoc')), value),
        trueExpr,
        falseExpr,
      )),
      null,
    );
  }

  static ifEqual(a: faunadb.ExprArg, b: faunadb.ExprArg, trueExpr: faunadb.ExprArg | null,
    falseExpr: faunadb.ExprArg | null) : faunadb.Expr {
    return q.If(q.Equals(a, b), trueExpr, falseExpr);
  }

  static ifNull(a: faunadb.ExprArg, trueExpr: faunadb.ExprArg | null,
    falseExpr: faunadb.ExprArg | null) : faunadb.Expr {
    return q.If(q.IsNull(a), trueExpr, falseExpr);
  }

  static firstPage(set: faunadb.Expr, size?: number) : faunadb.Expr {
    return q.Paginate(set, { size });
  }

  static getFirstPage(set: faunadb.Expr, size?: number) : faunadb.Expr {
    return q.Map(q.Paginate(set, { size }), q.Lambda(['ref'], q.Get(q.Var('ref'))));
  }

  static getSortedResults(set: faunadb.Expr) : faunadb.Expr {
    return q.Map(set, q.Lambda(['field1', 'ref'], q.Get(q.Var('ref'))));
  }

  static getSortedRefs(set: faunadb.Expr) : faunadb.Expr {
    return q.Map(set, q.Lambda(['field1', 'ref'], q.Var('ref')));
  }

  async exec<T>(expr: faunadb.Expr) : Promise<T> {
    return this.client.query(expr);
  }

  onChange(ref: faunadb.Expr, handler: (data: FaunaStreamData)=> void,
    options?: { includeSnapshot?: boolean }) : () => void {
    const stream = this.client.stream.document(ref);
    stream.on('version', (data) => {
      handler(data as FaunaStreamData);
    });
    if (options?.includeSnapshot) {
      stream.on('snapshot', (data) => {
        handler({ document: data } as FaunaStreamData);
      });
    }
    stream.start();
    return () => stream.close();
  }

  async forEachPage<T>(set: faunadb.Expr, callback: (page: FaunaPage<T>) =>
  Promise<void>, options?: { size?: number, getDocs?: boolean }) : Promise<void> {
    let page: FaunaPage<T> = { data: [] };
    do {
      const paginate = q.Paginate(set, { after: page?.after, size: options?.size });
      // eslint-disable-next-line no-await-in-loop
      page = await this.client.query(
        options?.getDocs
          ? q.Map(paginate, q.Lambda('pageDocRef', q.Get(q.Var('pageDocRef'))))
          : paginate,
      );
      // eslint-disable-next-line no-await-in-loop
      await callback(page);
    } while (page.after && page.data.length > 0);
  }

  async history<T>(ref: faunadb.Expr, maxAgeMs: number) : Promise<T[]> {
    const page = await this.client.query<FaunaPage<T>>(
      DBClient.pageOfEvents(ref, maxAgeMs),
    );

    return page.data;
  }
}
