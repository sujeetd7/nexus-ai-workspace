import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("auth", {
  prefix: "/api/v1/auth",
  upstream: env.AUTH_SERVICE_URL,
  rewritePrefix: "/api/v1/auth",
});
