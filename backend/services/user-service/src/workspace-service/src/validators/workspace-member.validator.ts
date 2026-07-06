import { z } from "zod";

export const addMemberSchema = z.object({
  workspaceId: z.string(),

  userId: z.string(),

  role: z.enum(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]),
});
