import { UserRole } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),

  firstName: z.string().optional(),

  lastName: z.string().optional(),

  role: z.nativeEnum(UserRole).optional(),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
