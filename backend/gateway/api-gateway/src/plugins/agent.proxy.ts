import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("agent", {
  prefix: "/api/v1/agents",
  upstream: env.AGENT_SERVICE_URL,
});