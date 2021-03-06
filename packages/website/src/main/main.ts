import { Config, getLocalConfig } from "@eternal-twin/local-config";

import { Api, withApi } from "./api.js";
import { main } from "./index.js";

async function realMain(): Promise<void> {
  const config: Config = await getLocalConfig();

  return withApi(config, (api: Api): Promise<never> => {
    // Create a never-resolving promise so the API is never closed
    return new Promise<never>(() => {
      main(api);
    });
  });
}

realMain()
  .catch((err: Error): never => {
    console.error(err.stack);
    process.exit(1);
  });
