import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Auth", description: "Authentication and session management" }];

export const authStableRoutes: StableRoute[] = [
  { method: "get", path: "/health", operationId: "authHealth", public: true },
  { method: "post", path: "/api/v1/auth/register", operationId: "authRegister", public: true },
  { method: "post", path: "/api/v1/auth/login", operationId: "authLogin", public: true },
  { method: "post", path: "/api/v1/auth/refresh", operationId: "authRefresh", public: true },
  { method: "post", path: "/api/v1/auth/logout", operationId: "authLogout" },
  { method: "delete", path: "/api/v1/auth/sessions", operationId: "authLogoutAll" },
  { method: "get", path: "/api/v1/auth/sessions", operationId: "authSessionList" },
  { method: "delete", path: "/api/v1/auth/sessions/{id}", operationId: "authSessionRevoke" },
  { method: "post", path: "/api/v1/auth/verify-email", operationId: "authVerifyEmail", public: true },
  { method: "post", path: "/api/v1/auth/resend-verification", operationId: "authResendVerification", public: true },
  { method: "post", path: "/api/v1/auth/forgot-password", operationId: "authForgotPassword", public: true },
  { method: "post", path: "/api/v1/auth/reset-password", operationId: "authResetPassword", public: true },
  { method: "get", path: "/profile/me", operationId: "authCurrentProfile" },
];

const authConfig: ServiceSpecConfig = {
  service: "auth",
  title: "Nexus Auth Service API",
  version: "1.0.0",
  description:
    "Authentication, session management, and current profile. Password change is not exposed as a stable route.",
  serverUrl: "http://localhost:3001",
  apiPrefix: "/api/v1/auth",
  tags,
  stableRoutes: authStableRoutes,
  paths: {
    "/health": {
      get: operation("authHealth", "Service health", {
        tags: ["Auth"],
        security: [],
        responses: {
          "200": jsonResponse("200", "Healthy"),
        },
      }),
    },
    "/api/v1/auth/register": {
      post: operation("authRegister", "Register a new account", {
        tags: ["Auth"],
        security: [],
        description: "Public route. Account may require email verification before full access.",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            firstName: { type: "string" },
            lastName: { type: "string" },
          },
        }),
        responses: {
          "201": jsonResponse("201", "Registered", {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              user: { type: "object" },
            },
          }),
          ...standardErrorResponses(["400", "409", "429", "500"]),
        },
      }),
    },
    "/api/v1/auth/login": {
      post: operation("authLogin", "Login", {
        tags: ["Auth"],
        security: [],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Login successful", {
            type: "object",
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              user: { type: "object" },
            },
          }),
          ...standardErrorResponses(["400", "401", "423", "429", "500"]),
        },
      }),
    },
    "/api/v1/auth/refresh": {
      post: operation("authRefresh", "Refresh access token", {
        tags: ["Auth"],
        security: [],
        description:
          "Refresh token must belong to the caller session context. Public at Gateway; ownership enforced by Auth Service.",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        }),
        responses: {
          "200": jsonResponse("200", "Token refreshed"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/auth/logout": {
      post: operation("authLogout", "Logout current session", {
        tags: ["Auth"],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["refreshToken"],
          properties: { refreshToken: { type: "string" } },
        }),
        responses: {
          "204": { description: "Logged out" },
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/auth/sessions": {
      get: operation("authSessionList", "List active sessions", {
        tags: ["Auth"],
        responses: {
          "200": jsonResponse("200", "Session list"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
      delete: operation("authLogoutAll", "Revoke all sessions", {
        tags: ["Auth"],
        responses: {
          "204": { description: "All sessions revoked" },
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
    "/api/v1/auth/sessions/{id}": {
      delete: operation("authSessionRevoke", "Revoke a session", {
        tags: ["Auth"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Session revoked" },
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/auth/verify-email": {
      post: operation("authVerifyEmail", "Verify email address", {
        tags: ["Auth"],
        security: [],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["token"],
          properties: { token: { type: "string" } },
        }),
        responses: {
          "200": jsonResponse("200", "Email verified"),
          ...standardErrorResponses(["400", "404", "500"]),
        },
      }),
    },
    "/api/v1/auth/resend-verification": {
      post: operation("authResendVerification", "Resend verification email", {
        tags: ["Auth"],
        security: [],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        }),
        responses: {
          "202": jsonResponse("202", "Verification email queued"),
          ...standardErrorResponses(["400", "429", "500"]),
        },
      }),
    },
    "/api/v1/auth/forgot-password": {
      post: operation("authForgotPassword", "Request password reset", {
        tags: ["Auth"],
        security: [],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        }),
        responses: {
          "200": jsonResponse("200", "Reset email sent if account exists"),
          ...standardErrorResponses(["400", "429", "500"]),
        },
      }),
    },
    "/api/v1/auth/reset-password": {
      post: operation("authResetPassword", "Reset password with token", {
        tags: ["Auth"],
        security: [],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["token", "password"],
          properties: {
            token: { type: "string" },
            password: { type: "string", format: "password" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "Password reset"),
          ...standardErrorResponses(["400", "404", "500"]),
        },
      }),
    },
    "/profile/me": {
      get: operation("authCurrentProfile", "Get current authenticated profile", {
        tags: ["Auth"],
        description:
          "Direct Auth Service route (not proxied by Gateway). Requires verified access token.",
        responses: {
          "200": jsonResponse("200", "Current profile"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
    },
  },
};

export const authOpenApiSpec = buildServiceSpec(authConfig);

export { authStableRoutes as stableRoutes };
