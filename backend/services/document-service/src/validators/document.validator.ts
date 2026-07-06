import { z } from "zod";

export const documentSchema = z.object({
  workspaceId: z.string(),

  uploadedBy: z.string(),

  filename: z.string(),

  mimeType: z.string(),

  size: z.number(),

  storagePath: z.string(),

  metadata: z.any().optional(),
});
