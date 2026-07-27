import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("admin", {
  prefix: "/api/v1/admin",
  upstream: env.ADMIN_SERVICE_URL,
});
