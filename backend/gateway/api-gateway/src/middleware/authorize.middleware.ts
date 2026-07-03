import { UserRole } from "@prisma/client";
import { FastifyReply, FastifyRequest } from "fastify";

export function authorize(roles: UserRole[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      return reply.status(401).send();
    }

    if (!roles.includes(req.user.role)) {
      return reply.status(403).send({
        error: "Forbidden",
      });
    }
  };
}
