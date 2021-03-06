import { CaseStyle } from "kryo";
import { LiteralType } from "kryo/literal";
import { RecordIoType, RecordType } from "kryo/record";

import { $ObjectType, ObjectType } from "../core/object-type.js";
import { $UserId, UserId } from "./user-id.js";

/**
 * Wrapper object for a user id.
 */
export interface UserIdRef {
  type: ObjectType.User;
  id: UserId;
}

export const $UserIdRef: RecordIoType<UserIdRef> = new RecordType<UserIdRef>({
  properties: {
    type: {type: new LiteralType({type: $ObjectType, value: ObjectType.User})},
    id: {type: $UserId},
  },
  changeCase: CaseStyle.SnakeCase,
});
