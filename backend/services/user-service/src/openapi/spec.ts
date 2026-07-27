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

const tags = [{ name: "Users", description: "User profile and directory operations" }];

export const userStableRoutes: StableRoute[] = [
  { method: "post", path: "/api/v1/users", operationId: "userCreate" },
  { method: "get", path: "/api/v1/users", operationId: "userList" },
  { method: "get", path: "/api/v1/users/me", operationId: "userGetMe" },
  { method: "patch", path: "/api/v1/users/me", operationId: "userUpdateMe" },
  { method: "get", path: "/api/v1/users/{id}", operationId: "userGet" },
  { method: "patch", path: "/api/v1/users/{id}", operationId: "userUpdate" },
  { method: "delete", path: "/api/v1/users/{id}", operationId: "userDelete" },
];

const userConfig: ServiceSpecConfig = {
  service: "users",
  title: "Nexus User Service API",
  version: "1.0.0",
  description:
    "User directory CRUD. Credentials and password management belong to Auth Service.",
  serverUrl: "http://localhost:3003",
  apiPrefix: "/api/v1/users",
  tags,
  stableRoutes: userStableRoutes,
  paths: {
    "/api/v1/users": {
      get: operation("userList", "List users", {
        tags: ["Users"],
        responses: {
          "200": jsonResponse("200", "User list"),
          ...standardErrorResponses(["401", "403", "500"]),
        },
      }),
      post: operation("userCreate", "Create user", {
        tags: ["Users"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "User created"),
          ...standardErrorResponses(["400", "401", "409", "500"]),
        },
      }),
    },
    "/api/v1/users/me": {
      get: operation("userGetMe", "Get current user profile", {
        tags: ["Users"],
        description:
          "Returns the profile for the verified access-token subject. Identity is never taken from client-supplied user IDs.",
        responses: {
          "200": jsonResponse("200", "Current user profile"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
      patch: operation("userUpdateMe", "Update current user profile", {
        tags: ["Users"],
        description:
          "Updates profile fields for the verified access-token subject.",
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Updated profile"),
          ...standardErrorResponses(["400", "401", "404", "500"]),
        },
      }),
    },
    "/api/v1/users/{id}": {
      get: operation("userGet", "Get user by ID", {
        tags: ["Users"],
        parameters: [pathParam("id", "User ID")],
        responses: {
          "200": jsonResponse("200", "User details"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
      patch: operation("userUpdate", "Update user profile", {
        tags: ["Users"],
        parameters: [pathParam("id", "User ID")],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "200": jsonResponse("200", "Updated user"),
          ...standardErrorResponses(["400", "401", "403", "404", "500"]),
        },
      }),
      delete: operation("userDelete", "Delete user", {
        tags: ["Users"],
        parameters: [pathParam("id", "User ID")],
        responses: {
          "200": jsonResponse("200", "User deleted"),
          ...standardErrorResponses(["401", "403", "404", "500"]),
        },
      }),
    },
  },
};

export const userOpenApiSpec = buildServiceSpec(userConfig);
export { userStableRoutes as stableRoutes };
