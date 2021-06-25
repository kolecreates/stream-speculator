import { DBToken, LoginAsGuestResponse } from "../../common/types";
import APIResponse from "../APIResponse";
import Cookie from "../Cookie";
import { default as DB, FaunaTokenDoc, FaunaDoc } from "../DBClient";
import RedundantRequestError from "../errors/RedundantRequestError";
import UnAuthorizedError from "../errors/UnAuthorizedError";

const db = new DB();

const GUEST_TTL_DAYS = 7;
const GUEST_TTL_MS = GUEST_TTL_DAYS * 86400 * 1000; 
const DB_TOKEN_TTL_SEC = 30 * 60;

export type AuthSession = {
    userId: string;
    isGuest: boolean;
};

export const getDBToken = async (session: AuthSession | null) : Promise<DBToken> => {
    if(session){
      const { secret } = await db.exec<FaunaTokenDoc>(DB.token(DB.users.doc(session.userId), DB.ttl(DB_TOKEN_TTL_SEC, 'seconds')));
      return { secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 };
    }else{
        throw new UnAuthorizedError("GetDBToken");
    }
};

export const loginAsGuest = async (session: AuthSession | null) : Promise<APIResponse<LoginAsGuestResponse>> => {
    if(session){
        throw new RedundantRequestError("LoginAsGuest");
    }else {
    const { user, token } = await db.exec<{ user: FaunaDoc, token: FaunaTokenDoc }>(
        DB.named({
            user: DB.create(DB.users, { isGuest: true }, DB.ttl(GUEST_TTL_DAYS, 'days')),
            token: DB.token(DB.varToRef("user"), DB.ttl(DB_TOKEN_TTL_SEC, 'seconds'))
        })
    );
    const userId = user.ref.id;
    return new APIResponse<LoginAsGuestResponse>({
        data: { userId, dbToken: { secret: token.secret, expiresAt: Date.now() + DB_TOKEN_TTL_SEC * 1000 }},
        cookies: [new Cookie("session", { userId, isGuest: true }, GUEST_TTL_MS)]
    });
    }
};