import { createProxy } from "./create-proxy";
import { env } from "../config/env";

/**
 * Auth routes:
 * - Public at Gateway: register, login, refresh, verify, resend, forgot/reset.
 * - Protected Auth endpoints (logout, sessions) are enforced by Auth Service middleware.
 * Gateway does not require a token for the auth prefix so public flows work;
 * spoofed identity headers are still stripped.
 */
export default createProxy("auth", {
  prefix: "/api/v1/auth",
  upstream: env.AUTH_SERVICE_URL,
  rewritePrefix: "/api/v1/auth",
  requireAuth: false,
});
