import fastifyProxy from "@fastify/http-proxy";
import fp from "fastify-plugin";
import { env } from "../config/env";

interface ProxyConfig {
  prefix: string;
  upstream: string;
  rewritePrefix?: string;
}

export function createProxy(serviceName: string, config: ProxyConfig) {
  return fp(async (fastify: any) => {
    console.log(`${serviceName.toUpperCase()} UPSTREAM:`, config.upstream);

    await fastify.register(fastifyProxy as any, {
      upstream: config.upstream,
      prefix: config.prefix,
      rewritePrefix: config.rewritePrefix || "/api/v1",

      // Timeout configuration
      httpTimeout: env.PROXY_TIMEOUT,

      // Header forwarding
      replyOptions: {
        rewriteRequestHeaders: (originalReq: any, headers: any) => {
          const forwardedHeaders = {
            ...headers,
          };

          // Preserve authentication and tracing headers
          const headersToForward = [
            "authorization",
            "x-request-id",
            "x-correlation-id",
            "x-user-id",
            "x-workspace-id",
            "traceparent",
          ];

          headersToForward.forEach((header) => {
            if (originalReq.headers[header]) {
              forwardedHeaders[header] = originalReq.headers[header];
            }
          });

          return forwardedHeaders;
        },
      },

      // Preserve streaming
      websocket: false, // Disable websocket proxy unless needed

      // Error handling
      undici: {
        requestTimeout: env.PROXY_TIMEOUT,
      },
    });
  });
}
