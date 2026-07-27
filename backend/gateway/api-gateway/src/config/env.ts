import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

/**
 * Canonical Gateway environment contract.
 *
 * Access-token secret must match Auth Service (`JWT_ACCESS_SECRET`).
 * Do not use a divergent JWT_SECRET / development-secret pair.
 */
function requireAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.trim().length === 0) {
    // Align with Auth JwtService fallback so local defaults cannot diverge.
    return "development-secret";
  }
  return secret;
}

export const env = {
  PORT: parseInt(process.env.PORT ?? "3000", 10),
  NODE_ENV: process.env.NODE_ENV ?? "development",

  PROXY_TIMEOUT: parseInt(process.env.PROXY_TIMEOUT ?? "30000", 10),
  STREAM_TIMEOUT: parseInt(process.env.STREAM_TIMEOUT ?? "300000", 10),
  /** Max proxied request body (bytes). Applies to multipart and JSON. */
  PROXY_BODY_LIMIT: parseInt(
    process.env.PROXY_BODY_LIMIT ?? String(25 * 1024 * 1024),
    10,
  ),

  /**
   * Same contract as Auth Service access-token signing.
   * Auth: process.env.JWT_ACCESS_SECRET || "development-secret"
   */
  JWT_ACCESS_SECRET: requireAccessSecret(),

  // Verified product upstreams (conflict-free local defaults)
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
  WORKSPACE_SERVICE_URL:
    process.env.WORKSPACE_SERVICE_URL ?? "http://localhost:3002",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL ?? "http://localhost:3003",
  DOCUMENT_SERVICE_URL:
    process.env.DOCUMENT_SERVICE_URL ?? "http://localhost:3004",
  PROMPT_SERVICE_URL: process.env.PROMPT_SERVICE_URL ?? "http://localhost:3005",
  CHAT_SERVICE_URL: process.env.CHAT_SERVICE_URL ?? "http://localhost:3006",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? "http://localhost:3007",
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL ?? "http://localhost:3008",
  /** Document owns 3004; Kernel default is 3010. */
  AI_KERNEL_URL: process.env.AI_KERNEL_URL ?? "http://localhost:3010",
};

export type GatewayEnv = typeof env;

/**
 * Implemented product upstreams for readiness (no Admin/Analytics/Notification).
 * Probe paths prefer dedicated /health where present; otherwise a stable mounted
 * route is used — any HTTP response counts as reachable.
 */
export const UPSTREAM_SERVICES = [
  { name: "auth", url: () => env.AUTH_SERVICE_URL, healthPath: "/health" },
  {
    name: "user",
    url: () => env.USER_SERVICE_URL,
    healthPath: "/api/v1/users",
  },
  {
    name: "workspace",
    url: () => env.WORKSPACE_SERVICE_URL,
    healthPath: "/health",
  },
  {
    name: "document",
    url: () => env.DOCUMENT_SERVICE_URL,
    healthPath: "/api/v1/documents",
  },
  {
    name: "prompt",
    url: () => env.PROMPT_SERVICE_URL,
    healthPath: "/api/v1/prompts",
  },
  { name: "ai", url: () => env.AI_SERVICE_URL, healthPath: "/api/v1/health" },
  {
    name: "chat",
    url: () => env.CHAT_SERVICE_URL,
    healthPath: "/api/v1/health",
  },
  {
    name: "agent",
    url: () => env.AGENT_SERVICE_URL,
    healthPath: "/api/v1/",
  },
  {
    name: "ai-kernel",
    url: () => env.AI_KERNEL_URL,
    healthPath: "/api/v1/kernel/health",
  },
] as const;
