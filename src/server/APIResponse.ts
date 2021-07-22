import { Response } from 'express';
import Cookie from './Cookie';

export enum APIResponseStatus {
  Ok = 200,
  UnAuthorized = 401,
  NotFound = 404,
  ServerError = 500,
}

export type APIResponseOptions<T extends {}> = {
  status: APIResponseStatus;
  data?: T;
  cookies: Cookie[];
  contentType?: string;
  onSend?: () => Promise<void>,
};

export default class APIResponse<T extends {}> {
  static EmptyOk = new APIResponse();

  static send<T>(options: Partial<APIResponseOptions<T>>, res: Response) : Promise<void> {
    return new APIResponse(options).send(res);
  }

  readonly options: APIResponseOptions<T>;

  constructor(options?: Partial<APIResponseOptions<T>>) {
    this.options = {
      status: APIResponseStatus.Ok,
      cookies: [],
      contentType: 'applicaiton/json',
      ...(options ?? {}),
    };
  }

  async send(res: Response) : Promise<void> {
    res.status(this.options.status);
    res.contentType(this.options.contentType as string);
    if (this.options.cookies.length > 0) {
      this.options.cookies.forEach((c) => {
        c.addTo(res);
      });
    }
    if (this.options.contentType === 'applicaiton/json') {
      res.json(this.options.data ?? {});
    } else {
      res.send(this.options.data);
    }
    if (this.options.onSend) {
      try {
        await this.options.onSend();
      } catch (e) {
        console.error(e);
      }
    }
  }
}
