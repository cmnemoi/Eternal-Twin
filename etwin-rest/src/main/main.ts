import Koa from "koa";
import koaLogger from "koa-logger";
import koaCors from "@koa/cors";
import koaMount from "koa-mount";
import { Api, createApiRouter } from "../lib/index.js";
import { InMemoryAnnouncementService } from "@eternal-twin/etwin-api-in-memory/announcement/service.js";
import { UUID4_GENERATOR } from "@eternal-twin/etwin-api-in-memory/uuid-generator.js";
import { KoaAuth } from "../lib/koa-auth.js";

async function main(): Promise<void> {
  const announcement = new InMemoryAnnouncementService(UUID4_GENERATOR);
  const koaAuth = new KoaAuth();
  const api: Api = {announcement, koaAuth};

  const apiRouter = createApiRouter(api);

  const app: Koa = new Koa();
  const port: number = 50320;

  app.use(koaLogger());
  // Allow local Angular development server
  app.use(koaCors({origin: "http://localhost:4200", credentials: true}));
  app.use(koaMount("/", apiRouter));

  app.listen(port, () => {
    console.log(`Listening on http://localhost:${port}`);
  });
}

main()
  .catch((err: Error): never => {
    console.error(err.stack);
    process.exit(1);
  });
