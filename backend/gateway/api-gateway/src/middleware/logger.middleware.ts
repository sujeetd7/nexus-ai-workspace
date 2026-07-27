import type { FastifyReply, FastifyRequest } from "fastify";

export async function loggerMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  req.log.info(
    {
      requestId: req.requestId,
      correlationId: req.correlationId,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
    },
    "request completed",
  );
}
