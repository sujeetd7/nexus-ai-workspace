import fastifyProxy from "@fastify/http-proxy";
import fp from "fastify-plugin";
import { env } from "../config/env";

export default fp(async (fastify) => {
  console.log("AUTH UPSTREAM:", env.AUTH_SERVICE_URL);

  await fastify.register(fastifyProxy as any, {
    upstream: env.AUTH_SERVICE_URL,
    prefix: "/api/v1/auth",
    rewritePrefix: "/api/v1/auth",
  });
});
