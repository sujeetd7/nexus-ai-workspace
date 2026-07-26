import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 3000),
  NODE_ENV: process.env.NODE_ENV || "development",
  
  // Service URLs
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
  WORKSPACE_SERVICE_URL: process.env.WORKSPACE_SERVICE_URL || "http://localhost:3002",
  USER_SERVICE_URL: process.env.USER_SERVICE_URL || "http://localhost:3003",
  AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL || "http://localhost:3004",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:3005",
  DOCUMENT_SERVICE_URL: process.env.DOCUMENT_SERVICE_URL || "http://localhost:3006",
  PROMPT_SERVICE_URL: process.env.PROMPT_SERVICE_URL || "http://localhost:3007",
  AI_KERNEL_URL: process.env.AI_KERNEL_URL || "http://localhost:3008",
  CHAT_SERVICE_URL: process.env.CHAT_SERVICE_URL || "http://localhost:3009",
};