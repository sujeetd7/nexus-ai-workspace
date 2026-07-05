import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z.string().email(),
  invitedBy: z.string(),
  role: z.enum(["OWNER", "ADMIN", "DEVELOPER", "VIEWER"]),
});

export const acceptInvitationSchema = z.object({
  token: z.string(),
});
