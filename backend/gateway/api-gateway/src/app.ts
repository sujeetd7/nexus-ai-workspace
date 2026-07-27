import Fastify, { FastifyError, FastifyInstance } from "fastify";

import { env } from "./config/env";
import { classifyUpstreamFailure, gatewayError } from "./errors/gateway-error";
import { loggerMiddleware } from "./middleware/logger.middleware";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import agentProxy from "./plugins/agent.proxy";
import aiProxy from "./plugins/ai.proxy";
import authProxy from "./plugins/auth.proxy";
import chatProxy from "./plugins/chat.proxy";
import documentProxy from "./plugins/document.proxy";
import kernelProxy from "./plugins/kernel.proxy";
import promptProxy from "./plugins/prompt.proxy";
import swaggerPlugin from "./plugins/swagger.plugin";
import userProxy from "./plugins/user.proxy";
import workspaceProxy from "./plugins/workspace.proxy";
import { healthRoutes } from "./routes/health.routes";
import { readinessRoutes } from "./routes/readiness.routes";

export interface BuildAppOptions {
  logger?: boolean | object;
}

/**
 * Build the canonical Gateway Fastify instance (does not listen).
 *
 * Implemented product proxies only — Admin / Analytics / Notification omitted.
 * Swagger aggregation wired in W4.
 */
export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: env.PROXY_BODY_LIMIT,
  });

  app.addHook("onRequest", requestIdMiddleware);
  app.addHook("onResponse", loggerMiddleware);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (
      error?.statusCode === 413 ||
      error?.code === "FST_ERR_CTP_BODY_TOO_LARGE"
    ) {
      return reply
        .status(413)
        .send(
          gatewayError(
            "payload_too_large",
            "Request body exceeds Gateway size limit",
            request.correlationId,
          ),
        );
    }

    const classified = classifyUpstreamFailure(error);
    if (classified.matched) {
      request.log.warn(
        { err: error, code: classified.code },
        "upstream_failure",
      );
      return reply
        .status(classified.status)
        .send(
          gatewayError(
            classified.code,
            classified.message,
            request.correlationId,
          ),
        );
    }

    request.log.error({ err: error }, "gateway_unhandled_error");

    if (!reply.sent) {
      return reply
        .status(
          error?.statusCode && error.statusCode < 500 ? error.statusCode : 500,
        )
        .send(
          gatewayError(
            "gateway_error",
            "Internal gateway error",
            request.correlationId,
          ),
        );
    }
  });

  await app.register(healthRoutes);
  await app.register(readinessRoutes);
  await app.register(swaggerPlugin, { fetchLiveSpecs: false });

  await app.register(authProxy);
  await app.register(workspaceProxy);
  await app.register(userProxy);
  await app.register(documentProxy);
  await app.register(promptProxy);
  await app.register(chatProxy);
  await app.register(aiProxy);
  await app.register(kernelProxy);
  await app.register(agentProxy);

  return app;
}

let _app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!_app) {
    _app = await buildApp();
  }
  return _app;
}

/** @deprecated Prefer buildApp() / getApp() */
export const app = {
  async listen(opts: { host?: string; port: number }) {
    const instance = await getApp();
    return instance.listen({ host: opts.host ?? "0.0.0.0", port: opts.port });
  },
  log: {
    error: (...args: unknown[]) => console.error(...args),
  },
};
