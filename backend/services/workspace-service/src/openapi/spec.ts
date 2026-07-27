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

const tags = [
  { name: "Workspaces", description: "Workspace lifecycle and membership" },
  { name: "Invitations", description: "Workspace invitations" },
];

export const workspaceStableRoutes: StableRoute[] = [
  { method: "get", path: "/api/v1/health", operationId: "workspaceHealth", public: true },
  { method: "get", path: "/health", operationId: "workspaceHealthRoot", public: true },
  { method: "post", path: "/api/v1/workspaces", operationId: "workspaceCreate" },
  { method: "get", path: "/api/v1/workspaces", operationId: "workspaceList" },
  { method: "get", path: "/api/v1/workspaces/{id}", operationId: "workspaceGet" },
  { method: "patch", path: "/api/v1/workspaces/{id}", operationId: "workspaceUpdate" },
  { method: "delete", path: "/api/v1/workspaces/{id}", operationId: "workspaceDelete" },
  { method: "post", path: "/api/v1/workspaces/{id}/members", operationId: "workspaceMemberAdd" },
  { method: "get", path: "/api/v1/workspaces/{id}/members", operationId: "workspaceMemberList" },
  { method: "get", path: "/api/v1/workspaces/{id}/members/{memberId}", operationId: "workspaceMemberGet" },
  { method: "patch", path: "/api/v1/workspaces/{id}/members/{memberId}", operationId: "workspaceMemberUpdateRole" },
  { method: "delete", path: "/api/v1/workspaces/{id}/members/{memberId}", operationId: "workspaceMemberRemove" },
  { method: "post", path: "/api/v1/workspaces/{id}/invitations", operationId: "workspaceInvitationCreate" },
  { method: "get", path: "/api/v1/workspaces/{id}/invitations", operationId: "workspaceInvitationList" },
  { method: "post", path: "/api/v1/workspaces/invitations/accept", operationId: "workspaceInvitationAccept" },
  { method: "post", path: "/api/v1/workspaces/invitations/reject", operationId: "workspaceInvitationReject" },
  { method: "delete", path: "/api/v1/workspaces/invitations/{invitationId}", operationId: "workspaceInvitationDelete" },
];

const workspaceConfig: ServiceSpecConfig = {
  service: "workspaces",
  title: "Nexus Workspace Service API",
  version: "1.0.0",
  description:
    "Workspace CRUD, members, and invitations. Invitation acceptance uses verified JWT identity; body userId is ignored.",
  serverUrl: "http://localhost:3002",
  apiPrefix: "/api/v1/workspaces",
  tags,
  stableRoutes: workspaceStableRoutes,
  paths: {
    "/api/v1/health": {
      get: operation("workspaceHealth", "Workspace service health", {
        tags: ["Workspaces"],
        security: [],
        responses: { "200": jsonResponse("200", "Healthy") },
      }),
    },
    "/health": {
      get: operation("workspaceHealthRoot", "Readiness health", {
        tags: ["Workspaces"],
        security: [],
        responses: { "200": jsonResponse("200", "Healthy") },
      }),
    },
    "/api/v1/workspaces": {
      get: operation("workspaceList", "List workspaces for caller", {
        tags: ["Workspaces"],
        parameters: [
          queryParam("page", "Page number", { schema: { type: "integer" } }),
          queryParam("limit", "Page size", { schema: { type: "integer" } }),
        ],
        responses: {
          "200": jsonResponse("200", "Paginated workspace list"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
      post: operation("workspaceCreate", "Create workspace", {
        tags: ["Workspaces"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Workspace created"),
          ...standardErrorResponses(["400", "401", "409", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/{id}": {
      get: operation("workspaceGet", "Get workspace details", {
        tags: ["Workspaces"],
        parameters: [pathParam("id", "Workspace ID")],
        responses: {
          "200": jsonResponse("200", "Workspace"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      patch: operation("workspaceUpdate", "Update workspace", {
        tags: ["Workspaces"],
        parameters: [pathParam("id", "Workspace ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Updated workspace"),
          ...standardErrorResponses(["400", "401", "403", "404", "500"]),
        },
      }),
      delete: operation("workspaceDelete", "Delete workspace", {
        tags: ["Workspaces"],
        parameters: [pathParam("id", "Workspace ID")],
        responses: {
          "200": jsonResponse("200", "Workspace deleted"),
          ...standardErrorResponses(["401", "403", "404", "409", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/{id}/members": {
      get: operation("workspaceMemberList", "List workspace members", {
        tags: ["Workspaces"],
        parameters: [pathParam("id", "Workspace ID")],
        responses: {
          "200": jsonResponse("200", "Members"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      post: operation("workspaceMemberAdd", "Add workspace member", {
        tags: ["Workspaces"],
        parameters: [pathParam("id", "Workspace ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Member added"),
          ...standardErrorResponses(["400", "401", "403", "404", "409", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/{id}/members/{memberId}": {
      get: operation("workspaceMemberGet", "Get member", {
        tags: ["Workspaces"],
        parameters: [
          pathParam("id", "Workspace ID"),
          pathParam("memberId", "Member ID"),
        ],
        responses: {
          "200": jsonResponse("200", "Member"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      patch: operation("workspaceMemberUpdateRole", "Update member role", {
        tags: ["Workspaces"],
        parameters: [
          pathParam("id", "Workspace ID"),
          pathParam("memberId", "Member ID"),
        ],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Role updated"),
          ...standardErrorResponses(["400", "401", "403", "404", "500"]),
        },
      }),
      delete: operation("workspaceMemberRemove", "Remove member", {
        tags: ["Workspaces"],
        parameters: [
          pathParam("id", "Workspace ID"),
          pathParam("memberId", "Member ID"),
        ],
        responses: {
          "200": jsonResponse("200", "Member removed"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/{id}/invitations": {
      get: operation("workspaceInvitationList", "List invitations", {
        tags: ["Invitations"],
        parameters: [pathParam("id", "Workspace ID")],
        responses: {
          "200": jsonResponse("200", "Invitations"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      post: operation("workspaceInvitationCreate", "Create invitation", {
        tags: ["Invitations"],
        parameters: [pathParam("id", "Workspace ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Invitation created"),
          ...standardErrorResponses(["400", "401", "403", "404", "409", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/invitations/accept": {
      post: operation("workspaceInvitationAccept", "Accept invitation", {
        tags: ["Invitations"],
        description:
          "Identity is taken from verified Bearer token subject. Request body userId is not accepted as a stable override.",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["token"],
          properties: {
            token: { type: "string" },
            email: { type: "string", format: "email" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Invitation accepted"),
          ...standardErrorResponses(["401", "403", "404", "409", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/invitations/reject": {
      post: operation("workspaceInvitationReject", "Reject invitation", {
        tags: ["Invitations"],
        security: [],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Invitation rejected"),
          ...standardErrorResponses(["400", "404", "500"]),
        },
      }),
    },
    "/api/v1/workspaces/invitations/{invitationId}": {
      delete: operation("workspaceInvitationDelete", "Delete invitation", {
        tags: ["Invitations"],
        parameters: [pathParam("invitationId", "Invitation ID")],
        responses: {
          "200": jsonResponse("200", "Invitation deleted"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
  },
};

export const workspaceOpenApiSpec = buildServiceSpec(workspaceConfig);
export { workspaceStableRoutes as stableRoutes };
