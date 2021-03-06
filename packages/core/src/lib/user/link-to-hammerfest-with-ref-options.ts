import { CaseStyle } from "kryo";
import { LiteralType } from "kryo/literal";
import { RecordIoType, RecordType } from "kryo/record";

import { $HammerfestServer, HammerfestServer } from "../hammerfest/hammerfest-server.js";
import { $HammerfestUserId, HammerfestUserId } from "../hammerfest/hammerfest-user-id.js";
import { $LinkToHammerfestMethod, LinkToHammerfestMethod } from "./link-to-hammerfest-method.js";
import { $UserId, UserId } from "./user-id.js";

export interface LinkToHammerfestWithRefOptions {
  method: LinkToHammerfestMethod.Ref;

  /**
   * Id of the Eternal-Twin user to link.
   */
  userId: UserId;

  /**
   * Hammerfest server.
   */
  hammerfestServer: HammerfestServer;

  /**
   * User id for the Hammerfest user.
   */
  hammerfestUserId: HammerfestUserId;
}

export const $LinkToHammerfestWithRefOptions: RecordIoType<LinkToHammerfestWithRefOptions> = new RecordType<LinkToHammerfestWithRefOptions>({
  properties: {
    method: {type: new LiteralType({type: $LinkToHammerfestMethod, value: LinkToHammerfestMethod.Ref})},
    userId: {type: $UserId},
    hammerfestServer: {type: $HammerfestServer},
    hammerfestUserId: {type: $HammerfestUserId},
  },
  changeCase: CaseStyle.SnakeCase,
});
