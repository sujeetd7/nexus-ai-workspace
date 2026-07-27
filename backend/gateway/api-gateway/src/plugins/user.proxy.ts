import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("user", {
  prefix: "/api/v1/users",
  upstream: env.USER_SERVICE_URL,
});
