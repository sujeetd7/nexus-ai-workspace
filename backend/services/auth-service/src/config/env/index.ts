import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const defaultEnv = {
  NODE_ENV: "development",
  PORT: 3001,
  LOG_LEVEL: "info",
  SERVICE_NAME: "auth-service",
} as const;

const envSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "test",
      "production",
    ])
    .default(defaultEnv.NODE_ENV),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultEnv.PORT),

  LOG_LEVEL: z
    .string()
    .min(1)
    .default(defaultEnv.LOG_LEVEL),

  SERVICE_NAME: z
    .string()
    .min(1)
    .default(defaultEnv.SERVICE_NAME),
});

const parsedEnv =
  envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map(issue => {
      const key =
        issue.path.join(".") || "ENV";

      return `${key}: ${issue.message}`;
    })
    .join("; ");

  console.warn(
    `Invalid environment configuration. Using safe defaults. ${details}`
  );
}

export const env =
  parsedEnv.success
    ? parsedEnv.data
    : defaultEnv;

export type Env = typeof env;
