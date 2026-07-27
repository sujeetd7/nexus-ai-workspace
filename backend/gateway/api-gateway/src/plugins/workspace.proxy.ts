import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("workspace", {
  prefix: "/api/v1/workspaces",
  upstream: env.WORKSPACE_SERVICE_URL,
  rewritePrefix: "/api/v1/workspaces",
  requireAuth: true,
});
