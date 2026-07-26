import { z } from "zod";

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export type ResendVerificationSchemaType = z.infer<
  typeof resendVerificationSchema
>;
