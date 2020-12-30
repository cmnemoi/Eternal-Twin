import { TaggedUnionType } from "kryo/lib/tagged-union.js";

import { $CompleteIfSelfUserFields, CompleteIfSelfUserFields } from "./complete-if-self-user-fields.js";
import { $CompleteUserFields, CompleteUserFields } from "./complete-user-fields.js";
import { $DefaultUserFields, DefaultUserFields } from "./default-user-fields.js";
import { ShortUserFields } from "./short-user-fields";

export type UserFields =
  CompleteIfSelfUserFields
  | CompleteUserFields
  | DefaultUserFields
  | ShortUserFields;

export const $UserFields: TaggedUnionType<UserFields> = new TaggedUnionType<UserFields>({
  variants: [$CompleteIfSelfUserFields, $CompleteUserFields, $DefaultUserFields],
  tag: "type",
});