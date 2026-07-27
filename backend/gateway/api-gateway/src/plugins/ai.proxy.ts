import { createProxy } from "./create-proxy";
import { env } from "../config/env";

/**
 * Public Gateway prefix /api/v1/ai → AI Service /api/v1/*
 * SSE routes: POST /api/v1/ai/stream, POST /api/v1/ai/chat/stream
 * (proxied without response buffering via @fastify/http-proxy).
 */
export default createProxy("ai", {
  prefix: "/api/v1/ai",
  upstream: env.AI_SERVICE_URL,
  rewritePrefix: "/api/v1",
  requireAuth: true,
  httpTimeout: env.STREAM_TIMEOUT,
});
