import { UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: UserRole;
    };

    requestId?: string;
  }
}
