import { z } from "zod";

export const verifyEmailSchema = z.object({
  token: z.string().min(32).max(256),
});

export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;
