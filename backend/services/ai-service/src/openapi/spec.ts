import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  queryParam,
  sseResponse,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "AI", description: "AI provider execution" }];

export const aiStableRoutes: StableRoute[] = [
  { method: "get", path: "/api/v1/health", operationId: "aiHealth", public: true },
  { method: "get", path: "/api/v1/providers", operationId: "aiProviderList" },
  { method: "get", path: "/api/v1/provider-health", operationId: "aiProviderHealth" },
  { method: "post", path: "/api/v1/execute", operationId: "aiExecute" },
  { method: "post", path: "/api/v1/stream", operationId: "aiStream" },
  { method: "post", path: "/api/v1/chat", operationId: "aiChat" },
  { method: "post", path: "/api/v1/chat/stream", operationId: "aiChatStream" },
  { method: "post", path: "/api/v1/embeddings", operationId: "aiEmbeddings" },
];

const aiConfig: ServiceSpecConfig = {
  service: "ai",
  title: "Nexus AI Service API",
  version: "1.0.0",
  description:
    "Provider/model execution and streaming. Provider API keys are never exposed.",
  serverUrl: "http://localhost:3007",
  apiPrefix: "/api/v1",
  tags,
  stableRoutes: aiStableRoutes,
  paths: {
    "/api/v1/health": {
      get: operation("aiHealth", "AI service health", {
        tags: ["AI"],
        security: [],
        responses: { "200": jsonResponse("200", "Healthy") },
      }),
    },
    "/api/v1/providers": {
      get: operation("aiProviderList", "List providers and models", {
        tags: ["AI"],
        responses: {
          "200": jsonResponse("200", "Providers"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
    "/api/v1/provider-health": {
      get: operation("aiProviderHealth", "Provider health check", {
        tags: ["AI"],
        parameters: [queryParam("provider", "Provider id")],
        responses: {
          "200": jsonResponse("200", "Provider health"),
          ...standardErrorResponses(["404", "503", "500"]),
        },
      }),
    },
    "/api/v1/execute": {
      post: operation("aiExecute", "Execute AI request", {
        tags: ["AI"],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: { type: "string" },
            provider: { type: "string" },
            model: { type: "string" },
            workspaceId: { type: "string" },
            tools: { type: "array", items: { type: "object" } },
          },
        }),
        responses: {
          "200": jsonResponse("200", "AI response with usage metadata"),
          "404": jsonResponse("404", "provider_not_found"),
          "502": jsonResponse("502", "provider_execution_failed"),
          "503": jsonResponse("503", "provider_unavailable"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/stream": {
      post: operation("aiStream", "Stream AI response (SSE)", {
        tags: ["AI"],
        description:
          "Streams `text/event-stream` events until a completion event. Swagger UI cannot execute SSE reliably.",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["prompt"],
          properties: { prompt: { type: "string" }, provider: { type: "string" }, model: { type: "string" } },
        }),
        responses: {
          "200": sseResponse("SSE stream of JSON events (token, done, error)"),
          ...standardErrorResponses(["400", "401", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/chat": {
      post: operation("aiChat", "Chat completion", {
        tags: ["AI"],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["messages"],
          properties: {
            messages: { type: "array", items: { type: "object" } },
            provider: { type: "string" },
            model: { type: "string" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Chat completion"),
          ...standardErrorResponses(["400", "401", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/chat/stream": {
      post: operation("aiChatStream", "Stream chat completion (SSE)", {
        tags: ["AI"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": sseResponse("SSE chat stream"),
          ...standardErrorResponses(["400", "401", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/embeddings": {
      post: operation("aiEmbeddings", "Create embeddings", {
        tags: ["AI"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Embeddings"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
  },
};

export const aiOpenApiSpec = buildServiceSpec(aiConfig);
export { aiStableRoutes as stableRoutes };
