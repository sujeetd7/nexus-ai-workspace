import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  pathParam,
  queryParam,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Documents", description: "Document metadata CRUD (no multipart upload route)" }];

export const documentStableRoutes: StableRoute[] = [
  { method: "post", path: "/api/v1/documents", operationId: "documentCreate" },
  { method: "get", path: "/api/v1/documents", operationId: "documentList" },
  { method: "get", path: "/api/v1/documents/{id}", operationId: "documentGet" },
  { method: "patch", path: "/api/v1/documents/{id}", operationId: "documentUpdate" },
  { method: "delete", path: "/api/v1/documents/{id}", operationId: "documentDelete" },
];

const documentConfig: ServiceSpecConfig = {
  service: "documents",
  title: "Nexus Document Service API",
  version: "1.0.0",
  description:
    "Document metadata CRUD. Multipart file upload is not implemented as a stable HTTP route in W4.",
  serverUrl: "http://localhost:3004",
  apiPrefix: "/api/v1/documents",
  tags,
  stableRoutes: documentStableRoutes,
  paths: {
    "/api/v1/documents": {
      get: operation("documentList", "List documents", {
        tags: ["Documents"],
        parameters: [
          queryParam("workspaceId", "Workspace scope filter"),
          queryParam("page", "Page", { schema: { type: "integer" } }),
          queryParam("limit", "Limit", { schema: { type: "integer" } }),
        ],
        responses: {
          "200": jsonResponse("200", "Document list"),
          ...standardErrorResponses(["401", "403", "500"]),
        },
      }),
      post: operation("documentCreate", "Create document metadata", {
        tags: ["Documents"],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["title", "workspaceId", "uploadedBy"],
          properties: {
            title: { type: "string" },
            workspaceId: { type: "string" },
            uploadedBy: { type: "string" },
            contentType: { type: "string" },
            status: { type: "string" },
          },
        }),
        responses: {
          "201": jsonResponse("201", "Document metadata created"),
          ...standardErrorResponses(["400", "401", "403", "500"]),
        },
      }),
    },
    "/api/v1/documents/{id}": {
      get: operation("documentGet", "Get document details", {
        tags: ["Documents"],
        parameters: [pathParam("id", "Document ID")],
        responses: {
          "200": jsonResponse("200", "Document"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      patch: operation("documentUpdate", "Update document metadata", {
        tags: ["Documents"],
        parameters: [pathParam("id", "Document ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Updated document"),
          ...standardErrorResponses(["400", "401", "403", "404", "500"]),
        },
      }),
      delete: operation("documentDelete", "Delete document", {
        tags: ["Documents"],
        parameters: [pathParam("id", "Document ID")],
        responses: {
          "200": jsonResponse("200", "Document deleted"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
  },
};

export const documentOpenApiSpec = buildServiceSpec(documentConfig);
export { documentStableRoutes as stableRoutes };
