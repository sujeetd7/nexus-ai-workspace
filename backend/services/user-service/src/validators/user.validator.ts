import { z } from "zod";

export const userSchema = z.object({
  authUserId: z.string(),

  email: z.string().email(),

  firstName: z.string().optional(),

  lastName: z.string().optional(),

  avatar: z.string().optional(),
});
