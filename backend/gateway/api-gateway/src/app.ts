import Fastify from "fastify";

import authProxy from "./plugins/auth.proxy";

import { healthRoutes } from "./routes/health.routes";

import { systemHealth } from "./routes/system.health.routes";

import { requestIdMiddleware } from "./middleware/request-id.middleware";

import { loggerMiddleware } from "./middleware/logger.middleware";

export const app = Fastify({
  logger: true,
});

app.addHook("onRequest", requestIdMiddleware);

app.addHook("onResponse", loggerMiddleware);

app.register(healthRoutes);

app.register(systemHealth);

app.register(authProxy);
