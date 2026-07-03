export async function healthRoutes(fastify: any) {
  fastify.get("/health", async () => {
    return {
      service: "api-gateway",
      status: "healthy",
      timestamp: new Date(),
    };
  });
}
