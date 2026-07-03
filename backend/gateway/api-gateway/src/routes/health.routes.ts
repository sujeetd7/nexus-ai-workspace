import { FastifyInstance } from "fastify";

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/health", async () => {
    return {
      service: "api-gateway",
      status: "healthy",
      timestamp: new Date(),
    };
  });
}
