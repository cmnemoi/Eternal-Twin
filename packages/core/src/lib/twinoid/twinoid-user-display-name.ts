import { $Ucs2String, Ucs2StringType } from "kryo/lib/ucs2-string.js";

/**
 * A Twinoid user display name
 *
 * This corresponds to the type of `User.nam` in the Twinoid API.
 */
export type TwinoidUserDisplayName = string;

export const $TwinoidUserDisplayName: Ucs2StringType = $Ucs2String;