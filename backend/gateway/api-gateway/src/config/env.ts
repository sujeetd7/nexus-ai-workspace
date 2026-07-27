import dotenv from "dotenv";
import path from "path";

console.log("PROCESS CWD:", process.cwd());

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

console.log("PORT ENV:", process.env.PORT);
console.log("AUTH ENV:", process.env.AUTH_SERVICE_URL);

export const env = {
  PORT: parseInt(process.env.PORT ?? "3000", 10),

  // Proxy Configuration
  PROXY_TIMEOUT: parseInt(process.env.PROXY_TIMEOUT ?? "30000", 10),

  // Service URLs
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL ?? "http://localhost:3001",
  WORKSPACE_SERVICE_URL:
    process.env.WORKSPACE_SERVICE_URL ?? "http://localhost:3002",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL ?? "http://localhost:3003",
  DOCUMENT_SERVICE_URL:
    process.env.DOCUMENT_SERVICE_URL ?? "http://localhost:3006",
  PROMPT_SERVICE_URL: process.env.PROMPT_SERVICE_URL ?? "http://localhost:3007",
  CHAT_SERVICE_URL: process.env.CHAT_SERVICE_URL ?? "http://localhost:3009",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL ?? "http://localhost:3005",
  AI_KERNEL_URL: process.env.AI_KERNEL_URL ?? "http://localhost:3008",
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL ?? "http://localhost:3004",
  ADMIN_SERVICE_URL: process.env.ADMIN_SERVICE_URL ?? "http://localhost:3010",
  NOTIFICATION_SERVICE_URL:
    process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:3011",
  ANALYTICS_SERVICE_URL:
    process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:3012",

  JWT_SECRET: process.env.JWT_SECRET ?? "development-secret",
};

console.log("FINAL ENV:", env);
