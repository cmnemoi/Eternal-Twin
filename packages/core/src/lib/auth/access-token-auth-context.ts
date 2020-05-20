import { CaseStyle } from "kryo";
import { LiteralType } from "kryo/lib/literal.js";
import { RecordIoType, RecordType } from "kryo/lib/record.js";

import { $OauthClientRef, OauthClientRef } from "../oauth/oauth-client-ref.js";
import { $UserRef, UserRef } from "../user/user-ref.js";
import { $AuthScope, AuthScope } from "./auth-scope.js";
import { $AuthType, AuthType } from "./auth-type.js";

export interface AccessTokenAuthContext {
  type: AuthType.AccessToken;
  scope: AuthScope;
  client: OauthClientRef;
  user: UserRef;
}

export const $AccessTokenAuthContext: RecordIoType<AccessTokenAuthContext> = new RecordType<AccessTokenAuthContext>({
  properties: {
    type: {type: new LiteralType({type: $AuthType, value: AuthType.AccessToken})},
    scope: {type: $AuthScope},
    client: {type: $OauthClientRef},
    user: {type: $UserRef},
  },
  changeCase: CaseStyle.SnakeCase,
});