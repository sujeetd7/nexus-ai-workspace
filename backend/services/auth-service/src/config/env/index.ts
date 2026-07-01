import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const defaultEnv = {
  NODE_ENV: "development",
  PORT: 3001,
  LOG_LEVEL: "info",
  SERVICE_NAME: "auth-service",
  AUTH_MAX_FAILED_LOGIN_ATTEMPTS: 5,
  AUTH_LOCK_DURATION_MINUTES: 30,
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: 30,
  EMAIL_VERIFICATION_BASE_URL: "http://localhost:3000/verify-email",
} as const;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default(defaultEnv.NODE_ENV),

  PORT: z.coerce.number().int().positive().default(defaultEnv.PORT),

  LOG_LEVEL: z.string().min(1).default(defaultEnv.LOG_LEVEL),

  SERVICE_NAME: z.string().min(1).default(defaultEnv.SERVICE_NAME),

  AUTH_MAX_FAILED_LOGIN_ATTEMPTS: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultEnv.AUTH_MAX_FAILED_LOGIN_ATTEMPTS),

  AUTH_LOCK_DURATION_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultEnv.AUTH_LOCK_DURATION_MINUTES),

  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(defaultEnv.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES),

  EMAIL_VERIFICATION_BASE_URL: z
    .string()
    .url()
    .default(defaultEnv.EMAIL_VERIFICATION_BASE_URL),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => {
      const key = issue.path.join(".") || "ENV";

      return `${key}: ${issue.message}`;
    })
    .join("; ");

  console.warn(
    `Invalid environment configuration. Using safe defaults. ${details}`,
  );
}

export const env = parsedEnv.success ? parsedEnv.data : defaultEnv;

export type Env = typeof env;
