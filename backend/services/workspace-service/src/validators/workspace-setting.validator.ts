import { z } from "zod";

export const workspaceSettingSchema = z.object({
  allowGuests: z.boolean().optional(),

  allowPublicPrompts: z.boolean().optional(),

  maxMembers: z.number().optional(),

  storageQuotaGb: z.number().optional(),
});
