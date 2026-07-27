import type { FastifyInstance } from "fastify";

/**
 * GET /health — Gateway process liveness only (no upstream checks).
 */
export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async () => {
    return {
      service: "api-gateway",
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  });
}
