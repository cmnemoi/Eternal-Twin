import { $Uint8 } from "kryo/lib/integer.js";
import { WhiteListType } from "kryo/lib/white-list.js";

/**
 * Hammerfest pyramid rank
 *
 * - `0`: Hall of fame
 * - `1`: Level 1
 * - `2`: Level 2
 * - `3`: Level 3
 * - `4`: Level 4
 */
export type HammerfestLadderLevel = 0 | 1 | 2 | 3 | 4;

export const $HammerfestLadderLevel: WhiteListType<HammerfestLadderLevel> = new WhiteListType({
  itemType: $Uint8,
  values: [0, 1, 2, 3, 4],
});