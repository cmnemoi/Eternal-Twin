import { JSON_READER } from "kryo-json/lib/json-reader.js";
import { JSON_VALUE_READER } from "kryo-json/lib/json-value-reader.js";
import { JSON_WRITER } from "kryo-json/lib/json-writer.js";
import { registerErrMochaTests, registerMochaSuites, TestItem } from "kryo-testing";

import { ObjectType } from "../../lib/core/object-type.js";
import { $HammerfestUserIdRef, HammerfestUserIdRef } from "../../lib/hammerfest/hammerfest-user-id-ref.js";

describe("HammerfestUserIdRef", function () {
  const items: TestItem<HammerfestUserIdRef>[] = [
    {
      name: "Elseabora",
      value: {
        type: ObjectType.HammerfestUser,
        server: "hammerfest.fr",
        id: "127",
      },
      io: [
        {
          writer: JSON_WRITER,
          reader: JSON_READER,
          raw: "{\"type\":\"HammerfestUser\",\"server\":\"hammerfest.fr\",\"id\":\"127\"}",
        },
        {
          reader: JSON_VALUE_READER,
          raw: {
            type: "HammerfestUser",
            server: "hammerfest.fr",
            id: "127",
          },
        },
      ],
    },
  ];

  registerMochaSuites($HammerfestUserIdRef, items);

  describe("Reader", function () {
    const invalids: string[] = [
      "",
    ];
    registerErrMochaTests(JSON_READER, $HammerfestUserIdRef, invalids);
  });
});
