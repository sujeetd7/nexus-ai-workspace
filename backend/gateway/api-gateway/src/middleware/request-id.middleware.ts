import crypto from "crypto";
import { FastifyReply, FastifyRequest } from "fastify";

export async function requestIdMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = crypto.randomUUID();

  req.requestId = requestId;

  reply.header("x-request-id", requestId);
}
