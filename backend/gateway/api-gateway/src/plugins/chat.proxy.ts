import { createProxy } from "./create-proxy";
import { env } from "../config/env";

/**
 * Public Gateway prefix /api/v1/chat → Chat Service /api/v1/*
 * (Chat mounts /conversations, /messages under /api/v1.)
 */
export default createProxy("chat", {
  prefix: "/api/v1/chat",
  upstream: env.CHAT_SERVICE_URL,
  rewritePrefix: "/api/v1",
  requireAuth: true,
});
