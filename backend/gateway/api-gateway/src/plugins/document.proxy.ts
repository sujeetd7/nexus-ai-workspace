import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("document", {
  prefix: "/api/v1/documents",
  upstream: env.DOCUMENT_SERVICE_URL,
  rewritePrefix: "/api/v1/documents",
  requireAuth: true,
});
