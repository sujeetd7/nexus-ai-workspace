import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("notification", {
  prefix: "/api/v1/notifications",
  upstream: env.NOTIFICATION_SERVICE_URL,
});
