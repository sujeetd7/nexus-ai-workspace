export async function systemHealth(fastify: any) {
  fastify.get("/system/health", async () => {
    const auth = await fetch("http://localhost:3001/health");

    return {
      gateway: "UP",

      auth: auth.ok ? "UP" : "DOWN",
    };
  });
}
