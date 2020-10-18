import { InMemoryAuthService } from "@eternal-twin/auth-in-memory";
import { PgAuthService } from "@eternal-twin/auth-pg";
import { AuthService } from "@eternal-twin/core/lib/auth/service.js";
import { ForumService } from "@eternal-twin/core/lib/forum/service.js";
import { HammerfestArchiveService } from "@eternal-twin/core/lib/hammerfest/archive.js";
import { HammerfestClientService } from "@eternal-twin/core/lib/hammerfest/client.js";
import { LinkService } from "@eternal-twin/core/lib/link/service.js";
import { OauthClientService } from "@eternal-twin/core/lib/oauth/client-service.js";
import { OauthProviderService } from "@eternal-twin/core/lib/oauth/provider-service.js";
import { TwinoidArchiveService } from "@eternal-twin/core/lib/twinoid/archive.js";
import { UserService } from "@eternal-twin/core/lib/user/service.js";
import { ConsoleEmailService } from "@eternal-twin/email-console";
import { EtwinEmailTemplateService } from "@eternal-twin/email-template-etwin";
import { InMemoryForumService } from "@eternal-twin/forum-in-memory";
import { PgForumService } from "@eternal-twin/forum-pg";
import { InMemoryHammerfestArchiveService } from "@eternal-twin/hammerfest-archive-in-memory";
import { PgHammerfestArchiveService } from "@eternal-twin/hammerfest-archive-pg";
import { HttpHammerfestClientService } from "@eternal-twin/hammerfest-client-http";
import { InMemoryLinkService } from "@eternal-twin/link-in-memory";
import { PgLinkService } from "@eternal-twin/link-pg";
import { ApiType, Config } from "@eternal-twin/local-config";
import { HttpOauthClientService } from "@eternal-twin/oauth-client-http";
import { InMemoryOauthProviderService } from "@eternal-twin/oauth-provider-in-memory";
import { PgOauthProviderService } from "@eternal-twin/oauth-provider-pg";
import { ScryptPasswordService } from "@eternal-twin/password-scrypt";
import { createPgPool, Database } from "@eternal-twin/pg-db";
import { KoaAuth } from "@eternal-twin/rest-server/lib/helpers/koa-auth.js";
import { InMemoryTwinoidArchiveService } from "@eternal-twin/twinoid-archive-in-memory";
import { PgTwinoidArchiveService } from "@eternal-twin/twinoid-archive-pg";
import { HttpTwinoidClientService } from "@eternal-twin/twinoid-client-http";
import { TwinoidClientService } from "@eternal-twin/twinoid-core/lib/client.js";
import { InMemoryUserService } from "@eternal-twin/user-in-memory";
import { PgUserService } from "@eternal-twin/user-pg";
import { UUID4_GENERATOR } from "@eternal-twin/uuid4-generator";
import url from "url";
import urljoin from "url-join";

export interface Api {
  auth: AuthService;
  forum: ForumService;
  hammerfestArchive: HammerfestArchiveService;
  hammerfestClient: HammerfestClientService;
  koaAuth: KoaAuth;
  oauthClient: OauthClientService;
  oauthProvider: OauthProviderService;
  twinoidClient: TwinoidClientService;
  user: UserService;
}

async function createApi(config: Config): Promise<{api: Api; teardown(): Promise<void>}> {
  const secretKeyStr: string = config.etwin.secret;
  const secretKeyBytes: Uint8Array = Buffer.from(secretKeyStr);
  const email = new ConsoleEmailService();
  const emailTemplate = new EtwinEmailTemplateService(new url.URL(config.etwin.externalUri.toString()));
  const password = new ScryptPasswordService();
  const hammerfestClient = new HttpHammerfestClientService();
  const twinoidClient = new HttpTwinoidClientService();

  let auth: AuthService;
  let forum: ForumService;
  let hammerfestArchive: HammerfestArchiveService;
  let link: LinkService;
  let oauthProvider: OauthProviderService;
  let twinoidArchive: TwinoidArchiveService;
  let user: UserService;
  let teardown: () => Promise<void>;

  if (config.etwin.api === ApiType.InMemory) {
    const imUser: InMemoryUserService = new InMemoryUserService(UUID4_GENERATOR);
    user = imUser;
    const imOauthProvider = new InMemoryOauthProviderService(UUID4_GENERATOR, password, secretKeyBytes);
    oauthProvider = imOauthProvider;
    hammerfestArchive = new InMemoryHammerfestArchiveService();
    twinoidArchive = new InMemoryTwinoidArchiveService();
    link = new InMemoryLinkService(hammerfestArchive, twinoidArchive, user);
    auth = new InMemoryAuthService(email, emailTemplate, hammerfestArchive, hammerfestClient, link, imOauthProvider, password, secretKeyBytes, twinoidArchive, twinoidClient, imUser, UUID4_GENERATOR);
    forum = new InMemoryForumService(UUID4_GENERATOR, user, {postsPerPage: config.forum.postsPerPage, threadsPerPage: config.forum.threadsPerPage});
    teardown = async function(): Promise<void> {};
  } else {
    const {pool, teardown: teardownPool} = createPgPool({
      host: config.db.host,
      port: config.db.port,
      name: config.db.name,
      user: config.db.user,
      password: config.db.password,
    });
    const db = new Database(pool);
    const pgHammerfestArchive = new PgHammerfestArchiveService(db);
    hammerfestArchive = pgHammerfestArchive;
    const pgTwinoidArchive = new PgTwinoidArchiveService(db);
    twinoidArchive = pgTwinoidArchive;
    const pgUser = new PgUserService(db, secretKeyStr);
    user = pgUser;
    const pgLink = new PgLinkService(db, pgHammerfestArchive, pgTwinoidArchive, pgUser);
    link = pgLink;
    hammerfestArchive = new PgHammerfestArchiveService(db);
    auth = new PgAuthService(db, secretKeyStr, email, emailTemplate, pgHammerfestArchive, hammerfestClient, pgLink, password, secretKeyBytes, pgTwinoidArchive, twinoidClient, UUID4_GENERATOR);
    oauthProvider = new PgOauthProviderService(db, UUID4_GENERATOR, password, secretKeyStr, secretKeyBytes);
    forum = new PgForumService(db, UUID4_GENERATOR, user, {postsPerPage: config.forum.postsPerPage, threadsPerPage: config.forum.threadsPerPage});
    teardown = async function(): Promise<void> {
      await teardownPool();
    };
  }

  const koaAuth = new KoaAuth(auth);
  const oauthClient = new HttpOauthClientService(
    new url.URL("https://twinoid.com/oauth/auth"),
    new url.URL("https://twinoid.com/oauth/token"),
    config.auth.twinoid.clientId,
    config.auth.twinoid.secret,
    new url.URL(urljoin(config.etwin.externalUri.toString(), "oauth/callback")),
    secretKeyBytes,
  );

  for (const [key, client] of config.clients) {
    await oauthProvider.createOrUpdateSystemClient(
      key,
      {
        displayName: client.displayName,
        appUri: client.appUri.toString(),
        callbackUri: client.callbackUri.toString(),
        secret: Buffer.from(client.secret),
      }
    );
  }

  for (const [key, section] of config.forum.sections) {
    await forum.createOrUpdateSystemSection(
      key,
      {
        displayName: section.displayName,
        locale: section.locale,
      },
    );
  }

  const api: Api = {auth, forum, hammerfestArchive, hammerfestClient, koaAuth, oauthClient, oauthProvider, twinoidClient, user};

  return {api, teardown};
}

/**
 * Async resource manager for the Eternalfest API backend.
 *
 * @param config Server config
 * @param fn Inner function to call with an API pool.
 */
export async function withApi<R>(config: Readonly<Config>, fn: (api: Api) => Promise<R>): Promise<R> {
  const {api, teardown} = await createApi(config);
  try {
    return await fn(api);
  } finally {
    await teardown();
  }
}
