import { createProxy } from "./create-proxy";
import { env } from "../config/env";

export default createProxy("kernel", {
  prefix: "/api/v1/kernel",
  upstream: env.AI_KERNEL_URL,
  rewritePrefix: "",
});
