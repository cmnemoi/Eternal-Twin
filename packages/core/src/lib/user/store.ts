import { CompleteIfSelfUserFields } from "./complete-if-self-user-fields.js";
import { CompleteSimpleUser } from "./complete-simple-user.js";
import { CompleteUserFields } from "./complete-user-fields.js";
import { CreateUserOptions } from "./create-user-options.js";
import { DefaultUserFields } from "./default-user-fields.js";
import { GetUserOptions } from "./get-user-options.js";
import { ShortUser } from "./short-user.js";
import { ShortUserFields } from "./short-user-fields.js";
import { ShortUserWithPassword } from "./short-user-with-password.js";
import { SimpleUser } from "./simple-user.js";
import { UpdateStoreUserOptions } from "./update-store-user-options.js";
import { UserId } from "./user-id.js";

export interface UserStore {
  createUser(options: Readonly<CreateUserOptions>): Promise<SimpleUser>;

  getUserWithPassword(options: Readonly<GetUserOptions>): Promise<ShortUserWithPassword | null>;

  getUser(options: Readonly<GetUserOptions & {fields: ShortUserFields}>): Promise<ShortUser | null>;
  getUser(options: Readonly<GetUserOptions & {fields: DefaultUserFields}>): Promise<SimpleUser | null>;
  getUser(options: Readonly<GetUserOptions & {fields: CompleteUserFields}>): Promise<CompleteSimpleUser | null>;
  getUser(options: Readonly<GetUserOptions & {fields: DefaultUserFields | CompleteUserFields | CompleteIfSelfUserFields}>): Promise<SimpleUser | CompleteSimpleUser | null>;
  getUser(options: Readonly<GetUserOptions>): Promise<ShortUser | SimpleUser | CompleteSimpleUser | null>;

  hardDeleteUser(userId: UserId): Promise<void>;

  updateUser(options: Readonly<UpdateStoreUserOptions>): Promise<CompleteSimpleUser>;
}
