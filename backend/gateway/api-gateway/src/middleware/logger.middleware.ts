import { FastifyReply, FastifyRequest } from "fastify";

export async function loggerMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const start = Date.now();

  reply.raw.on("finish", () => {
    console.log({
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      status: reply.statusCode,
      duration: `${Date.now() - start}ms`,
    });
  });
}
