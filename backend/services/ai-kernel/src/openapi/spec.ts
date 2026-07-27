import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Kernel", description: "AI Kernel public HTTP surface" }];

/** Only mounted public Kernel routes — internal modules are not documented as APIs. */
export const kernelStableRoutes: StableRoute[] = [
  { method: "post", path: "/api/v1/kernel/execute", operationId: "kernelExecute" },
  { method: "get", path: "/api/v1/kernel/health", operationId: "kernelHealth", public: true },
];

const kernelConfig: ServiceSpecConfig = {
  service: "kernel",
  title: "Nexus AI Kernel API",
  version: "1.0.0",
  description:
    "Public Kernel HTTP endpoints only. MCP, Planner, Scheduler, Workflow Engine, Coordinator, and built-in engineering agents are not exposed.",
  serverUrl: "http://localhost:3010",
  apiPrefix: "/api/v1/kernel",
  tags,
  stableRoutes: kernelStableRoutes,
  paths: {
    "/api/v1/kernel/execute": {
      post: operation("kernelExecute", "Execute kernel request", {
        tags: ["Kernel"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Kernel execution result"),
          ...standardErrorResponses(["400", "401", "500", "503"]),
        },
      }),
    },
    "/api/v1/kernel/health": {
      get: operation("kernelHealth", "Kernel health", {
        tags: ["Kernel"],
        security: [],
        responses: {
          "200": jsonResponse("200", "Health status"),
          ...standardErrorResponses(["500", "503"]),
        },
      }),
    },
  },
};

export const kernelOpenApiSpec = buildServiceSpec(kernelConfig);
export { kernelStableRoutes as stableRoutes };
