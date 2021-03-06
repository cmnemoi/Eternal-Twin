import { PgAnnouncementService } from "@eternal-twin/announcement-pg";
import { PgAuthService } from "@eternal-twin/auth-pg";
import { Url } from "@eternal-twin/core/lib/core/url";
import { ForumConfig } from "@eternal-twin/core/lib/forum/forum-config";
import { DefaultLinkService } from "@eternal-twin/core/lib/link/service";
import { DefaultOauthProviderService } from "@eternal-twin/core/lib/oauth/provider-service";
import { DefaultTwinoidService } from "@eternal-twin/core/lib/twinoid/service";
import { DefaultUserService } from "@eternal-twin/core/lib/user/service";
import { InMemoryEmailService } from "@eternal-twin/email-in-memory";
import { JsonEmailTemplateService } from "@eternal-twin/email-template-json";
import { forceCreateLatest } from "@eternal-twin/etwin-pg";
import { PgForumService } from "@eternal-twin/forum-pg";
import { getLocalConfig } from "@eternal-twin/local-config";
import { SystemClock, VirtualClock } from "@eternal-twin/native/lib/clock";
import { Database as NativeDatabase } from "@eternal-twin/native/lib/database";
import { MemDinoparcClient } from "@eternal-twin/native/lib/dinoparc-client";
import { PgDinoparcStore } from "@eternal-twin/native/lib/dinoparc-store";
import { MemHammerfestClient } from "@eternal-twin/native/lib/hammerfest-client";
import { PgHammerfestStore } from "@eternal-twin/native/lib/hammerfest-store";
import { PgLinkStore } from "@eternal-twin/native/lib/link-store";
import { ScryptPasswordService } from "@eternal-twin/native/lib/password";
import { NativeRestRouter } from "@eternal-twin/native/lib/rest";
import { NativeDinoparcService } from "@eternal-twin/native/lib/services/dinoparc";
import { NativeHammerfestService } from "@eternal-twin/native/lib/services/hammerfest";
import { PgTokenStore } from "@eternal-twin/native/lib/token-store";
import { HttpTwinoidClient } from "@eternal-twin/native/lib/twinoid-client";
import { PgTwinoidStore } from "@eternal-twin/native/lib/twinoid-store";
import { PgUserStore } from "@eternal-twin/native/lib/user-store";
import { Uuid4Generator } from "@eternal-twin/native/lib/uuid";
import { NativeClock } from "@eternal-twin/native/src/lib/clock";
import { PgOauthProviderStore } from "@eternal-twin/oauth-provider-pg";
import { Database, DbConfig, withPgPool } from "@eternal-twin/pg-db";
import http from "http";
import Koa from "koa";

import { KoaAuth } from "../lib/helpers/koa-auth.js";
import { Api, createApiRouter, DevApi } from "../lib/index.js";

export interface TestServer {
  hammerfestClient: MemHammerfestClient,
  server: http.Server,
}

export async function withTestServer<R>(isDev: boolean, fn: (server: TestServer) => Promise<R>): Promise<R> {
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

    let dev: DevApi | null;
    let clock: NativeClock;
    if (isDev) {
      const devClock = new VirtualClock();
      clock = devClock;
      dev = {clock: devClock};
    } else {
      dev = null;
      clock = new SystemClock();
    }
    const uuidGenerator = new Uuid4Generator();
    const secretKeyStr: string = config.etwin.secret;
    const secretKeyBytes: Uint8Array = Buffer.from(secretKeyStr);
    const email = new InMemoryEmailService();
    const emailTemplate = new JsonEmailTemplateService(new Url("https://eternal-twin.net"));
    const password = ScryptPasswordService.recommendedForTests();
    const userStore = new PgUserStore({clock, database: nativeDatabase, databaseSecret: secretKeyStr, uuidGenerator});
    const dinoparcClient = new MemDinoparcClient({clock});
    const dinoparcStore = await PgDinoparcStore.create({clock, database: nativeDatabase, uuidGenerator});
    const hammerfestClient = new MemHammerfestClient({clock});
    const hammerfestStore = await PgHammerfestStore.create({clock, database: nativeDatabase, databaseSecret: secretKeyStr, uuidGenerator});
    const twinoidClient = new HttpTwinoidClient({clock});
    const twinoidStore = new PgTwinoidStore({clock, database: nativeDatabase});
    const linkStore = new PgLinkStore({clock, database: nativeDatabase});
    const link = new DefaultLinkService({dinoparcStore, hammerfestStore, linkStore, twinoidStore, userStore});
    const dinoparc = await NativeDinoparcService.create({dinoparcStore, linkStore, userStore});
    const hammerfest = await NativeHammerfestService.create({hammerfestClient, hammerfestStore, linkStore, userStore});
    const twinoid = new DefaultTwinoidService({twinoidStore, link});
    const oauthProviderStore = new PgOauthProviderStore({
      database,
      databaseSecret: secretKeyStr,
      password,
      uuidGenerator
    });
    const oauthProvider = new DefaultOauthProviderService({
      clock,
      oauthProviderStore,
      userStore,
      tokenSecret: secretKeyBytes,
      uuidGenerator
    });
    const auth = new PgAuthService({
      database,
      databaseSecret: secretKeyStr,
      dinoparcClient,
      dinoparcStore,
      email,
      emailTemplate,
      hammerfestStore,
      hammerfestClient,
      link,
      oauthProvider,
      password,
      userStore,
      tokenSecret: secretKeyBytes,
      twinoidStore,
      twinoidClient,
      uuidGenerator
    });
    const koaAuth = new KoaAuth(auth);
    const token = await PgTokenStore.create({clock, database: nativeDatabase, databaseSecret: secretKeyStr});
    const forumConfig: ForumConfig = {
      postsPerPage: config.forum.postsPerPage,
      threadsPerPage: config.forum.threadsPerPage
    };
    const forum = new PgForumService(database, uuidGenerator, userStore, forumConfig);
    const announcement = new PgAnnouncementService({database, uuidGenerator, forum});
    const user = new DefaultUserService({
      dinoparcClient,
      dinoparcStore,
      hammerfestStore,
      hammerfestClient,
      link,
      password,
      userStore,
      token,
      twinoidStore,
      twinoidClient
    });
    const api: Api = {announcement, auth, clock, dev, forum, koaAuth, twinoid, user};
    const nativeRouter = await NativeRestRouter.create({dinoparc, hammerfest});

    const app: Koa = new Koa();
    const router = createApiRouter(api, nativeRouter);
    app.use(router.routes());
    app.use(router.allowedMethods());

    const server: http.Server = http.createServer(app.callback());

    async function closeServer(): Promise<void> {
      return new Promise<void>(resolve => {
        server.close(() => {
          resolve();
        });
      });
    }

    const result = new Promise<R>((resolve, reject): void => {
      async function onListening(): Promise<void> {
        server.removeListener("error", onError);

        let result: R;
        try {
          result = await fn({hammerfestClient, server});
        } catch (err) {
          await closeServer();
          reject(err);
          return;
        }
        await closeServer();
        resolve(result);
      }

      function onError(err: Error): void {
        server.removeListener("listening", onListening);
        reject(err);
      }

      server.once("listening", onListening);
      server.once("error", onError);

      server.listen();
    });

    try {
      return await result;
    } finally {
      await nativeDatabase.close();
    }
  });
}
