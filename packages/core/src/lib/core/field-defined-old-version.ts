import { CaseStyle } from "kryo";
import { $Boolean } from "kryo/lib/boolean.js";
import { RecordIoType, RecordType } from "kryo/lib/record.js";

import { $UserDot, UserDot } from "./user-dot.js";

export interface FieldDefinedOldVersion {
  start: UserDot;
  end: UserDot;
  defined: boolean;
}

export const $FieldDefinedOldVersion: RecordIoType<FieldDefinedOldVersion> = new RecordType<FieldDefinedOldVersion>({
  properties: {
    start: {type: $UserDot},
    end: {type: $UserDot},
    defined: {type: $Boolean},
  },
  changeCase: CaseStyle.SnakeCase,
});