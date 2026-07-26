const fastify = require("fastify") as any;

import authProxy from "./plugins/auth.proxy";
import workspaceProxy from "./plugins/workspace.proxy";
import userProxy from "./plugins/user.proxy";
import documentProxy from "./plugins/document.proxy";
import promptProxy from "./plugins/prompt.proxy";
import chatProxy from "./plugins/chat.proxy";
import aiProxy from "./plugins/ai.proxy";
import kernelProxy from "./plugins/kernel.proxy";
import agentProxy from "./plugins/agent.proxy";
import adminProxy from "./plugins/admin.proxy";
import notificationProxy from "./plugins/notification.proxy";
import analyticsProxy from "./plugins/analytics.proxy";

import { healthRoutes } from "./routes/health.routes";

import { systemHealth } from "./routes/system.health.routes";

import { requestIdMiddleware } from "./middleware/request-id.middleware";

import { loggerMiddleware } from "./middleware/logger.middleware";

export const app = fastify({
  logger: true,
});

app.addHook("onRequest", requestIdMiddleware);

app.addHook("onResponse", loggerMiddleware);

app.register(healthRoutes);

app.register(systemHealth);

// Service Proxy Registrations
app.register(authProxy);
app.register(workspaceProxy);
app.register(userProxy);
app.register(documentProxy);
app.register(promptProxy);
app.register(chatProxy);
app.register(aiProxy);
app.register(kernelProxy);
app.register(agentProxy);
app.register(adminProxy);
app.register(notificationProxy);
app.register(analyticsProxy);
