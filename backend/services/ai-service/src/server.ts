import dotenv from "dotenv";
import path from "path";

const __dirname = path.dirname(__filename);

// Load root .env before any other imports so providers read env vars correctly
dotenv.config({
  path: path.resolve(__dirname, "../../../../.env"),
});

// Validate required environment
import { validateEnv } from "./config/env";
validateEnv();

import { app } from "./app";
import logger from "./utils/logger";

const PORT = Number(process.env.PORT) || 3007;

const server = app.listen(PORT, () => {
  logger.info(`AI service running on ${PORT}`);
});

// Graceful shutdown
function shutdown(code = 0) {
  logger.info("Shutting down server...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(code);
  });
  // Force exit after timeout
  setTimeout(() => process.exit(code), 10000).unref();
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", (reason as any)?.message ?? reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", (err as any)?.message ?? err);
  shutdown(1);
});
