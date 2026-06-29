import { createServer } from "http";

import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`
=========================================
SERVICE : ${env.SERVICE_NAME}
PORT    : ${env.PORT}
ENV     : ${env.NODE_ENV}
=========================================
`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received");

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received");

  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});