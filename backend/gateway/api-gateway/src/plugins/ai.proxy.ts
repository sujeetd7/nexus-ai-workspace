import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("ai", {
  prefix: "/api/v1/ai",
  upstream: env.AI_SERVICE_URL,
});
