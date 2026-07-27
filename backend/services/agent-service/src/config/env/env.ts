import { config } from "dotenv";

config();

export const env = {
  PORT: Number(process.env.PORT || 3008),

  DATABASE_URL: process.env.DATABASE_URL || "",

  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || "development-secret",

  AI_KERNEL_URL:
    process.env.AI_KERNEL_URL || "http://127.0.0.1:3010/api/v1",
};
