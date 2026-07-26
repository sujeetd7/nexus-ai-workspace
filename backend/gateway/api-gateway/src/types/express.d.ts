// Local UserRole type to avoid depending on @prisma/client in the gateway
type UserRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER" | string;

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
