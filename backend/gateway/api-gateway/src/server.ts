import { app } from "./app";
import { env } from "./config/env";

async function start() {
  try {
    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    console.log(`
================================
SERVICE : api-gateway
PORT    : ${env.PORT}
================================
`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
