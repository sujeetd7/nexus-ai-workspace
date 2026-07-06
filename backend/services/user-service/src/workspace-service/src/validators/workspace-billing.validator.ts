import { z } from "zod";

export const workspaceBillingSchema = z.object({
  plan: z.string().optional(),

  credits: z.number().optional(),

  storageUsedGb: z.number().optional(),
});
