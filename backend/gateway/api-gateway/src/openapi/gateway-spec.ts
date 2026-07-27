import {
  jsonResponse,
  operation,
  OPENAPI_VERSION,
  standardComponents,
  bearerSecurity,
} from "@nexus/openapi";
import type { OpenApiDocument } from "@nexus/openapi";

export const gatewayOpenApiSpec: OpenApiDocument = {
  openapi: OPENAPI_VERSION,
  info: {
    title: "Nexus AI Workspace API Gateway",
    version: "1.0.0",
    description:
      "Canonical API portal for Nexus product services. Product paths are Gateway paths.",
  },
  servers: [{ url: "http://localhost:3000", description: "API Gateway" }],
  tags: [{ name: "Gateway", description: "Gateway operational endpoints" }],
  paths: {
    "/health": {
      get: operation("gatewayHealth", "Gateway health", {
        tags: ["Gateway"],
        security: [],
        responses: {
          "200": jsonResponse("200", "Gateway healthy"),
        },
      }),
    },
    "/ready": {
      get: operation("gatewayReadiness", "Gateway readiness", {
        tags: ["Gateway"],
        security: [],
        responses: {
          "200": jsonResponse("200", "Gateway ready"),
        },
      }),
    },
  },
  components: standardComponents(),
  security: bearerSecurity(),
};
