import { z } from "zod";

export const workspacePermissionSchema = z.object({
  userId: z.string(),
  permission: z.string(),
});
