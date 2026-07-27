import {
  buildServiceSpec,
  jsonRequestBody,
  jsonResponse,
  operation,
  pathParam,
  standardErrorResponses,
} from "@nexus/openapi";
import type { ServiceSpecConfig, StableRoute } from "@nexus/openapi";

const tags = [{ name: "Chat", description: "Conversations and AI-orchestrated messaging" }];

export const chatStableRoutes: StableRoute[] = [
  { method: "post", path: "/api/v1/conversations", operationId: "chatConversationCreate" },
  { method: "get", path: "/api/v1/conversations", operationId: "chatConversationList" },
  { method: "get", path: "/api/v1/conversations/{id}", operationId: "chatConversationGet" },
  { method: "delete", path: "/api/v1/conversations/{id}", operationId: "chatConversationDelete" },
  { method: "post", path: "/api/v1/conversations/member", operationId: "chatMemberAdd" },
  { method: "get", path: "/api/v1/conversations/{id}/members", operationId: "chatMemberList" },
  { method: "post", path: "/api/v1/messages/send", operationId: "chatSendMessage" },
  { method: "post", path: "/api/v1/messages", operationId: "chatMessageCreate" },
  { method: "get", path: "/api/v1/conversations/{id}/messages", operationId: "chatMessageList" },
  { method: "post", path: "/api/v1/attachments", operationId: "chatAttachmentAdd" },
];

const chatConfig: ServiceSpecConfig = {
  service: "chat",
  title: "Nexus Chat Service API",
  version: "1.0.0",
  description:
    "Conversation and message APIs. sendMessage orchestrates Chat → Prompt Service → AI Service with persistence; no fabricated fallback.",
  serverUrl: "http://localhost:3006",
  apiPrefix: "/api/v1",
  tags,
  stableRoutes: chatStableRoutes,
  paths: {
    "/api/v1/conversations": {
      get: operation("chatConversationList", "List conversations", {
        tags: ["Chat"],
        responses: {
          "200": jsonResponse("200", "Conversations"),
          ...standardErrorResponses(["401", "500"]),
        },
      }),
      post: operation("chatConversationCreate", "Create conversation", {
        tags: ["Chat"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Conversation created"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/conversations/{id}": {
      get: operation("chatConversationGet", "Get conversation", {
        tags: ["Chat"],
        parameters: [pathParam("id", "Conversation ID")],
        responses: {
          "200": jsonResponse("200", "Conversation"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
      delete: operation("chatConversationDelete", "Delete conversation", {
        tags: ["Chat"],
        parameters: [pathParam("id", "Conversation ID")],
        responses: {
          "200": jsonResponse("200", "Deleted"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/conversations/member": {
      post: operation("chatMemberAdd", "Add conversation member", {
        tags: ["Chat"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Member added"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/conversations/{id}/members": {
      get: operation("chatMemberList", "List conversation members", {
        tags: ["Chat"],
        parameters: [pathParam("id", "Conversation ID")],
        responses: {
          "200": jsonResponse("200", "Members"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/messages/send": {
      post: operation("chatSendMessage", "Send message with AI orchestration", {
        tags: ["Chat"],
        description:
          "Persists user message, calls Prompt Service then AI Service, persists assistant response. Upstream Prompt or AI failures surface as errors without silent fallback.",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["conversationId", "senderId", "content"],
          properties: {
            conversationId: { type: "string" },
            senderId: { type: "string" },
            content: { type: "string" },
            workspaceId: { type: "string" },
            promptId: { type: "string" },
            promptVersionId: { type: "string" },
            variables: { type: "object" },
            provider: { type: "string" },
            model: { type: "string" },
          },
        }),
        responses: {
          "200": jsonResponse("200", "User and assistant messages"),
          ...standardErrorResponses(["400", "401", "502", "503", "500"]),
        },
      }),
    },
    "/api/v1/messages": {
      post: operation("chatMessageCreate", "Create message without orchestration", {
        tags: ["Chat"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Message created"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
    "/api/v1/conversations/{id}/messages": {
      get: operation("chatMessageList", "List messages", {
        tags: ["Chat"],
        parameters: [pathParam("id", "Conversation ID")],
        responses: {
          "200": jsonResponse("200", "Messages"),
          ...standardErrorResponses(["401", "404", "500"]),
        },
      }),
    },
    "/api/v1/attachments": {
      post: operation("chatAttachmentAdd", "Add attachment metadata", {
        tags: ["Chat"],
        requestBody: jsonRequestBody({ type: "object" }),
        responses: {
          "201": jsonResponse("201", "Attachment added"),
          ...standardErrorResponses(["400", "401", "500"]),
        },
      }),
    },
  },
};

export const chatOpenApiSpec = buildServiceSpec(chatConfig);
export { chatStableRoutes as stableRoutes };
