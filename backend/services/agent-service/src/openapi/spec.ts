import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  pathParam,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Agents", description: "Product agent CRUD and execution" }];

export const agentStableRoutes: StableRoute[] = [
  { method: "get", path: "/api/v1/health", operationId: "agentHealth", public: true },
  { method: "post", path: "/api/v1/agents", operationId: "agentCreate" },
  { method: "get", path: "/api/v1/agents", operationId: "agentList" },
  { method: "get", path: "/api/v1/agents/{id}", operationId: "agentGet" },
  { method: "put", path: "/api/v1/agents/{id}", operationId: "agentUpdate" },
  { method: "delete", path: "/api/v1/agents/{id}", operationId: "agentDelete" },
  { method: "post", path: "/api/v1/agents/execute", operationId: "agentExecute" },
  { method: "get", path: "/api/v1/agents/executions", operationId: "agentExecutionList" },
  { method: "get", path: "/api/v1/agents/execution/{executionId}", operationId: "agentExecutionGet" },
  { method: "get", path: "/api/v1/agents/{agentId}/executions", operationId: "agentExecutionListByAgent" },
];

const agentConfig: ServiceSpecConfig = {
  service: "agents",
  title: "Nexus Product Agent Service API",
  version: "1.0.0",
  description:
    "Product-facing agents only. Engineering Platform reusable agents are not exposed.",
  serverUrl: "http://localhost:3008",
  apiPrefix: "/api/v1/agents",
  tags,
  stableRoutes: agentStableRoutes,
  paths: {
    "/api/v1/health": {
      get: operation("agentHealth", "Agent service health", {
        tags: ["Agents"],
        security: [],
        responses: { "200": jsonResponse("200", "Healthy") },
      }),
    },
    "/api/v1/agents": {
      get: operation("agentList", "List agents", {
        tags: ["Agents"],
        responses: {
          "200": jsonResponse("200", "Agents"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
      post: operation("agentCreate", "Create agent", {
        tags: ["Agents"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Agent created"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/agents/{id}": {
      get: operation("agentGet", "Get agent", {
        tags: ["Agents"],
        parameters: [pathParam("id", "Agent ID")],
        responses: {
          "200": jsonResponse("200", "Agent"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
      put: operation("agentUpdate", "Update agent", {
        tags: ["Agents"],
        parameters: [pathParam("id", "Agent ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Updated agent"),
          ...standardErrorResponses(["400", "401", "404", "500"]),
        },
      }),
      delete: operation("agentDelete", "Delete agent", {
        tags: ["Agents"],
        parameters: [pathParam("id", "Agent ID")],
        responses: {
          "200": jsonResponse("200", "Deleted"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
    "/api/v1/agents/execute": {
      post: operation("agentExecute", "Execute agent", {
        tags: ["Agents"],
        requestBody: jsonRequestBody({
          type: "object",
          properties: {
            agentId: { type: "string" },
            workspaceId: { type: "string" },
            input: { type: "object" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Execution started/completed"),
          "503": jsonResponse("503", "KERNEL_UNAVAILABLE"),
          ...standardErrorResponses(["400", "401", "404", "500"]),
        },
      }),
    },
    "/api/v1/agents/executions": {
      get: operation("agentExecutionList", "List executions", {
        tags: ["Agents"],
        responses: {
          "200": jsonResponse("200", "Executions"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
    "/api/v1/agents/execution/{executionId}": {
      get: operation("agentExecutionGet", "Get execution status", {
        tags: ["Agents"],
        parameters: [pathParam("executionId", "Execution ID")],
        responses: {
          "200": jsonResponse("200", "Execution detail"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/agents/{agentId}/executions": {
      get: operation("agentExecutionListByAgent", "Executions for agent", {
        tags: ["Agents"],
        parameters: [pathParam("agentId", "Agent ID")],
        responses: {
          "200": jsonResponse("200", "Executions"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
  },
};

export const agentOpenApiSpec = buildServiceSpec(agentConfig);
export { agentStableRoutes as stableRoutes };
