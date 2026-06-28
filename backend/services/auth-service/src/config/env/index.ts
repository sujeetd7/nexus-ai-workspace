import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.string().default("3001"),
  NODE_ENV: z.string().default("development"),
  SERVICE_NAME: z.string(),
});

export const env = EnvSchema.parse(process.env);