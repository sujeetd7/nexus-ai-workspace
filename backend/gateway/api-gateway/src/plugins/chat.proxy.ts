import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("chat", {
  prefix: "/api/v1/chat",
  upstream: env.CHAT_SERVICE_URL,
});
