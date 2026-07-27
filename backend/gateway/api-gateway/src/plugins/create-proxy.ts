import fastifyProxy from "@fastify/http-proxy";
import type {
  FastifyInstance,
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { IncomingHttpHeaders } from "node:http";
import fp from "fastify-plugin";
import { env } from "../config/env";
import { classifyUpstreamFailure, gatewayError } from "../errors/gateway-error";
import { authenticate } from "../middleware/authenticate.middleware";
import {
  injectVerifiedIdentity,
  stripClientIdentityHeaders,
} from "../middleware/identity.middleware";

export interface ProxyConfig {
  /** Public Gateway prefix (incoming). */
  prefix: string;
  /** Upstream origin (scheme + host + port), no path. */
  upstream: string;
  /**
   * Explicit upstream path prefix replacing `prefix`.
   * Must match the real mounted service route root.
   */
  rewritePrefix: string;
  /**
   * When true (default), require a valid access token except for publicPathMatchers.
   * Auth Service proxy sets requireAuth=false and relies on Auth's own middleware
   * for protected auth endpoints, while still stripping spoofed identity headers.
   */
  requireAuth?: boolean;
  /** Paths (relative to prefix or full url) that remain public when requireAuth is true. */
  publicPathMatchers?: RegExp[];
  /** Override proxy timeout (use STREAM_TIMEOUT for SSE routes). */
  httpTimeout?: number;
}

function isPublicPath(url: string, matchers?: RegExp[]): boolean {
  if (!matchers?.length) return false;
  const pathOnly = url.split("?")[0] ?? url;
  return matchers.some((re) => re.test(pathOnly));
}

interface HttpProxyRegisterOptions {
  upstream: string;
  prefix: string;
  rewritePrefix: string;
  httpTimeout: number;
  preHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  replyOptions: {
    rewriteRequestHeaders: (
      originalReq: FastifyRequest,
      headers: IncomingHttpHeaders,
    ) => IncomingHttpHeaders;
    onError: (reply: FastifyReply, payload: { error: Error }) => void;
  };
  undici: {
    connections: number;
    pipelining: number;
    bodyTimeout: number;
    headersTimeout: number;
  };
}

/**
 * Create a path-preserving HTTP proxy to one product service.
 * Preserves method, path suffix, query, body, headers, and upstream status.
 * Streams multipart and SSE without buffering the response body.
 */
export function createProxy(serviceName: string, config: ProxyConfig) {
  const requireAuth = config.requireAuth !== false;

  return fp(
    async (fastify: FastifyInstance) => {
      fastify.log.info(
        {
          service: serviceName,
          upstream: config.upstream,
          prefix: config.prefix,
          rewritePrefix: config.rewritePrefix,
        },
        "registering upstream proxy",
      );

      const proxyOptions: HttpProxyRegisterOptions = {
        upstream: config.upstream,
        prefix: config.prefix,
        rewritePrefix: config.rewritePrefix,
        httpTimeout: config.httpTimeout ?? env.PROXY_TIMEOUT,

        preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
          stripClientIdentityHeaders(request.headers);

          const publicRoute = isPublicPath(
            request.url,
            config.publicPathMatchers,
          );

          if (requireAuth && !publicRoute) {
            await authenticate(request, reply);
            if (reply.sent) return;
          }

          if (request.user) {
            injectVerifiedIdentity(request.headers, request.user);
          }
        },

        replyOptions: {
          rewriteRequestHeaders: (
            originalReq: FastifyRequest,
            headers: IncomingHttpHeaders,
          ) => {
            const forwarded: IncomingHttpHeaders = { ...headers };

            stripClientIdentityHeaders(forwarded);

            const correlationId =
              originalReq.correlationId ??
              originalReq.requestId ??
              originalReq.headers["x-correlation-id"] ??
              originalReq.headers["x-request-id"];

            if (correlationId) {
              forwarded["x-request-id"] = correlationId;
              forwarded["x-correlation-id"] = correlationId;
            }

            if (originalReq.headers?.authorization) {
              forwarded.authorization = originalReq.headers.authorization;
            }

            if (originalReq.user) {
              injectVerifiedIdentity(forwarded, originalReq.user);
            }

            // Preserve content-type (critical for multipart boundaries)
            if (originalReq.headers?.["content-type"]) {
              forwarded["content-type"] = originalReq.headers["content-type"];
            }

            return forwarded;
          },

          onError: (reply: FastifyReply, payload: { error: Error }) => {
            const classified = classifyUpstreamFailure(
              payload?.error ?? payload,
            );
            const correlationId = reply.request?.correlationId;

            if (!reply.sent) {
              reply
                .status(classified.status)
                .send(
                  gatewayError(
                    classified.code,
                    classified.message,
                    correlationId,
                  ),
                );
            }
          },
        },

        undici: {
          connections: 128,
          pipelining: 1,
          bodyTimeout: config.httpTimeout ?? env.PROXY_TIMEOUT,
          headersTimeout: config.httpTimeout ?? env.PROXY_TIMEOUT,
        },
      };

      await fastify.register(
        fastifyProxy as unknown as FastifyPluginCallback<HttpProxyRegisterOptions>,
        proxyOptions,
      );
    },
    {
      name: `proxy-${serviceName}`,
    },
  );
}

/**
 * Public route mapping table (used by tests and docs).
 * Incoming public path prefix → upstream rewrite prefix → service.
 */
export const ROUTE_MAP = [
  {
    service: "auth",
    publicPrefix: "/api/v1/auth",
    rewritePrefix: "/api/v1/auth",
    upstreamEnv: "AUTH_SERVICE_URL",
  },
  {
    service: "users",
    publicPrefix: "/api/v1/users",
    rewritePrefix: "/api/v1/users",
    upstreamEnv: "USER_SERVICE_URL",
  },
  {
    service: "workspaces",
    publicPrefix: "/api/v1/workspaces",
    rewritePrefix: "/api/v1/workspaces",
    upstreamEnv: "WORKSPACE_SERVICE_URL",
  },
  {
    service: "documents",
    publicPrefix: "/api/v1/documents",
    rewritePrefix: "/api/v1/documents",
    upstreamEnv: "DOCUMENT_SERVICE_URL",
  },
  {
    service: "prompts",
    publicPrefix: "/api/v1/prompts",
    rewritePrefix: "/api/v1/prompts",
    upstreamEnv: "PROMPT_SERVICE_URL",
  },
  {
    // Chat service mounts conversations under /api/v1 (not /api/v1/chat).
    service: "chat",
    publicPrefix: "/api/v1/chat",
    rewritePrefix: "/api/v1",
    upstreamEnv: "CHAT_SERVICE_URL",
  },
  {
    // AI service mounts execute/stream under /api/v1 (not /api/v1/ai).
    service: "ai",
    publicPrefix: "/api/v1/ai",
    rewritePrefix: "/api/v1",
    upstreamEnv: "AI_SERVICE_URL",
  },
  {
    service: "agents",
    publicPrefix: "/api/v1/agents",
    rewritePrefix: "/api/v1/agents",
    upstreamEnv: "AGENT_SERVICE_URL",
  },
  {
    service: "kernel",
    publicPrefix: "/api/v1/kernel",
    rewritePrefix: "/api/v1/kernel",
    upstreamEnv: "AI_KERNEL_URL",
  },
] as const;
