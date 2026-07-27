import { buildApp } from "./app";
import { env } from "./config/env";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(
      {
        service: "@nexus/api-gateway",
        port: env.PORT,
      },
      "canonical API Gateway listening",
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
