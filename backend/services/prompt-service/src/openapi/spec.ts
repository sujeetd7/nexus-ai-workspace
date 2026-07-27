import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  pathParam,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Prompts", description: "Prompt library and execution" }];

export const promptStableRoutes: StableRoute[] = [
  { method: "get", path: "/api/v1/prompts", operationId: "promptList" },
  { method: "post", path: "/api/v1/prompts", operationId: "promptCreate" },
  { method: "get", path: "/api/v1/prompts/analytics", operationId: "promptAnalytics" },
  { method: "get", path: "/api/v1/prompts/executions", operationId: "promptExecutionHistory" },
  { method: "post", path: "/api/v1/prompts/execute", operationId: "promptExecute" },
  { method: "post", path: "/api/v1/prompts/execute-direct", operationId: "promptExecuteDirect" },
  { method: "post", path: "/api/v1/prompts/execute-published", operationId: "promptExecutePublished" },
  { method: "post", path: "/api/v1/prompts/playground", operationId: "promptPlayground" },
  { method: "get", path: "/api/v1/prompts/execution/{executionId}", operationId: "promptExecutionGet" },
  { method: "get", path: "/api/v1/prompts/{id}", operationId: "promptGet" },
  { method: "delete", path: "/api/v1/prompts/{id}", operationId: "promptDelete" },
  { method: "get", path: "/api/v1/prompts/{promptId}/executions", operationId: "promptExecutionHistoryByPrompt" },
];

const promptConfig: ServiceSpecConfig = {
  service: "prompts",
  title: "Nexus Prompt Service API",
  version: "1.0.0",
  description:
    "Prompt CRUD, render/execute flows. execute stores history; executeDirect does not persist execution history by design.",
  serverUrl: "http://localhost:3005",
  apiPrefix: "/api/v1/prompts",
  tags,
  stableRoutes: promptStableRoutes,
  paths: {
    "/api/v1/prompts": {
      get: operation("promptList", "List prompts", {
        tags: ["Prompts"],
        responses: {
          "200": jsonResponse("200", "Prompt list"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
      post: operation("promptCreate", "Create prompt", {
        tags: ["Prompts"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Prompt created"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/prompts/analytics": {
      get: operation("promptAnalytics", "Prompt analytics", {
        tags: ["Prompts"],
        responses: {
          "200": jsonResponse("200", "Analytics"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
    "/api/v1/prompts/executions": {
      get: operation("promptExecutionHistory", "Global execution history", {
        tags: ["Prompts"],
        responses: {
          "200": jsonResponse("200", "Executions"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
    "/api/v1/prompts/execute": {
      post: operation("promptExecute", "Execute prompt (persisted history)", {
        tags: ["Prompts"],
        description: "Renders and executes a prompt version; execution history is stored.",
        requestBody: jsonRequestBody({
          type: "object",
          properties: {
            promptId: { type: "string" },
            versionId: { type: "string" },
            variables: { type: "object", additionalProperties: true },
            workspaceId: { type: "string" },
            provider: { type: "string" },
            model: { type: "string" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Execution result with usage metadata"),
          ...standardErrorResponses(["400", "401", "404", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/prompts/execute-published": {
      post: operation("promptExecutePublished", "Execute published prompt version", {
        tags: ["Prompts"],
        description: "Executes the published version for a prompt identifier.",
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Execution result"),
          ...standardErrorResponses(["400", "401", "404", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/prompts/execute-direct": {
      post: operation("promptExecuteDirect", "Execute prompt without history persistence", {
        tags: ["Prompts"],
        description:
          "Direct execution path. Does not store Prompt execution history when runtime intentionally skips persistence.",
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Execution result"),
          ...standardErrorResponses(["400", "401", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/prompts/playground": {
      post: operation("promptPlayground", "Preview/render prompt", {
        tags: ["Prompts"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Rendered prompt preview"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/prompts/execution/{executionId}": {
      get: operation("promptExecutionGet", "Get execution by ID", {
        tags: ["Prompts"],
        parameters: [pathParam("executionId", "Execution ID")],
        responses: {
          "200": jsonResponse("200", "Execution detail"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/prompts/{id}": {
      get: operation("promptGet", "Get prompt details", {
        tags: ["Prompts"],
        parameters: [pathParam("id", "Prompt ID")],
        responses: {
          "200": jsonResponse("200", "Prompt"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
      delete: operation("promptDelete", "Delete prompt", {
        tags: ["Prompts"],
        parameters: [pathParam("id", "Prompt ID")],
        responses: {
          "200": jsonResponse("200", "Deleted"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
    "/api/v1/prompts/{promptId}/executions": {
      get: operation("promptExecutionHistoryByPrompt", "Executions for prompt", {
        tags: ["Prompts"],
        parameters: [pathParam("promptId", "Prompt ID")],
        responses: {
          "200": jsonResponse("200", "Executions"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
  },
};

export const promptOpenApiSpec = buildServiceSpec(promptConfig);
export { promptStableRoutes as stableRoutes };
