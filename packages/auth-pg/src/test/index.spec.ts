import { Api, testAuthService } from "@eternal-twin/auth-test";
import { Url } from "@eternal-twin/core/lib/core/url";
import { DefaultLinkService } from "@eternal-twin/core/lib/link/service";
import { DefaultOauthProviderService } from "@eternal-twin/core/lib/oauth/provider-service";
import { InMemoryEmailService } from "@eternal-twin/email-in-memory";
import { JsonEmailTemplateService } from "@eternal-twin/email-template-json";
import { forceCreateLatest } from "@eternal-twin/etwin-pg";
import { getLocalConfig } from "@eternal-twin/local-config";
import { VirtualClock } from "@eternal-twin/native/lib/clock";
import { Database as NativeDatabase } from "@eternal-twin/native/lib/database";
import { MemDinoparcClient } from "@eternal-twin/native/lib/dinoparc-client";
import { PgDinoparcStore } from "@eternal-twin/native/lib/dinoparc-store";
import { MemHammerfestClient } from "@eternal-twin/native/lib/hammerfest-client";
import { PgHammerfestStore } from "@eternal-twin/native/lib/hammerfest-store";
import { PgLinkStore } from "@eternal-twin/native/lib/link-store";
import { ScryptPasswordService } from "@eternal-twin/native/lib/password";
import { HttpTwinoidClient } from "@eternal-twin/native/lib/twinoid-client";
import { PgTwinoidStore } from "@eternal-twin/native/lib/twinoid-store";
import { PgUserStore } from "@eternal-twin/native/lib/user-store";
import { Uuid4Generator } from "@eternal-twin/native/lib/uuid";
import { PgOauthProviderStore } from "@eternal-twin/oauth-provider-pg";
import { Database, DbConfig, withPgPool } from "@eternal-twin/pg-db";

import { PgAuthService } from "../lib/index.js";

async function withPgAuthService<R>(fn: (api: Api) => Promise<R>): Promise<R> {
  const config = await getLocalConfig();
  const adminDbConfig: DbConfig = {
    host: config.db.host,
    port: config.db.port,
    name: config.db.name,
    user: config.db.adminUser,
    password: config.db.adminPassword,
  };
  await withPgPool(adminDbConfig, async (pool) => {
    const database = new Database(pool);
    await forceCreateLatest(database);
  });

  const dbConfig: DbConfig = {
    host: config.db.host,
    port: config.db.port,
    name: config.db.name,
    user: config.db.user,
    password: config.db.password,
  };

  return withPgPool(dbConfig, async (pool) => {
    const database = new Database(pool);
    const nativeDatabase = await NativeDatabase.create(dbConfig);

    const clock = new VirtualClock();
    const uuidGenerator = new Uuid4Generator();
    const secretKeyStr: string = config.etwin.secret;
    const secretKeyBytes: Uint8Array = Buffer.from(secretKeyStr);
    const email = new InMemoryEmailService();
    const emailTemplate = new JsonEmailTemplateService(new Url("https://eternal-twin.net"));
    const password = ScryptPasswordService.recommendedForTests();
    const dinoparcStore = await PgDinoparcStore.create({clock, database: nativeDatabase, uuidGenerator});
    const hammerfestStore = await PgHammerfestStore.create({clock, database: nativeDatabase, databaseSecret: secretKeyStr, uuidGenerator});
    const twinoidStore = new PgTwinoidStore({clock, database: nativeDatabase});
    const userStore = new PgUserStore({clock, database: nativeDatabase, databaseSecret: secretKeyStr, uuidGenerator});
    const linkStore = new PgLinkStore({clock, database: nativeDatabase});
    const link = new DefaultLinkService({dinoparcStore, hammerfestStore, linkStore, twinoidStore, userStore});
    const dinoparcClient = new MemDinoparcClient({clock});
    const hammerfestClient = new MemHammerfestClient({clock});
    const twinoidClient = new HttpTwinoidClient({clock});
    const oauthProviderStore = new PgOauthProviderStore({database, databaseSecret: secretKeyStr, password, uuidGenerator});
    const oauthProvider = new DefaultOauthProviderService({clock, oauthProviderStore, userStore, tokenSecret: secretKeyBytes, uuidGenerator});
    const auth = new PgAuthService({database, databaseSecret: secretKeyStr, dinoparcClient, dinoparcStore, email, emailTemplate, hammerfestStore, hammerfestClient, link, oauthProvider, password, userStore, tokenSecret: secretKeyBytes, twinoidStore, twinoidClient, uuidGenerator});
    try {
      return await fn({auth, email, hammerfestClient, link});
    } finally {
      await nativeDatabase.close();
    }
  });
}

describe("PgAuthService", function () {
  testAuthService(withPgAuthService);
});
