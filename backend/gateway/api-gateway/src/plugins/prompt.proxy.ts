import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("prompt", {
  prefix: "/api/v1/prompts",
  upstream: env.PROMPT_SERVICE_URL,
});
