import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("analytics", {
  prefix: "/api/v1/analytics",
  upstream: env.ANALYTICS_SERVICE_URL,
});