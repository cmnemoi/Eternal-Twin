import { Ucs2StringType } from "kryo/lib/ucs2-string.js";
import { $UuidHex, UuidHex } from "kryo/lib/uuid-hex.js";

/**
 * The user id is a UUID representing an Eternal-Twin user.
 */
export type AnnouncementId = UuidHex;

export const $AnnouncementId: Ucs2StringType = $UuidHex;