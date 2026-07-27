import {
  assertUniqueOperationIds,
  assertValidOpenApiDocument,
  compareStableRoutes,
} from "../src/merge";
import { authOpenApiSpec, authStableRoutes } from "../../services/auth-service/src/openapi/spec";
import { userOpenApiSpec, userStableRoutes } from "../../services/user-service/src/openapi/spec";
import {
  workspaceOpenApiSpec,
  workspaceStableRoutes,
} from "../../services/workspace-service/src/openapi/spec";
import {
  documentOpenApiSpec,
  documentStableRoutes,
} from "../../services/document-service/src/openapi/spec";
import {
  promptOpenApiSpec,
  promptStableRoutes,
} from "../../services/prompt-service/src/openapi/spec";
import { aiOpenApiSpec, aiStableRoutes } from "../../services/ai-service/src/openapi/spec";
import { chatOpenApiSpec, chatStableRoutes } from "../../services/chat-service/src/openapi/spec";
import {
  agentOpenApiSpec,
  agentStableRoutes,
} from "../../services/agent-service/src/openapi/spec";
import {
  kernelOpenApiSpec,
  kernelStableRoutes,
} from "../../services/ai-kernel/src/openapi/spec";
import { mergeOpenApiSpecs, rewriteServiceSpecForGateway } from "../src/merge";

const allSpecs = [
  ["auth", authOpenApiSpec, authStableRoutes],
  ["users", userOpenApiSpec, userStableRoutes],
  ["workspaces", workspaceOpenApiSpec, workspaceStableRoutes],
  ["documents", documentOpenApiSpec, documentStableRoutes],
  ["prompts", promptOpenApiSpec, promptStableRoutes],
  ["ai", aiOpenApiSpec, aiStableRoutes],
  ["chat", chatOpenApiSpec, chatStableRoutes],
  ["agents", agentOpenApiSpec, agentStableRoutes],
  ["kernel", kernelOpenApiSpec, kernelStableRoutes],
] as const;

describe("@nexus/openapi service specs", () => {
  it.each(allSpecs)("%s spec is valid OpenAPI with unique operationIds", (_name, spec) => {
    expect(assertValidOpenApiDocument(spec)).toEqual([]);
    expect(assertUniqueOperationIds(spec)).toEqual([]);
    expect(spec.components?.securitySchemes).toHaveProperty("bearerAuth");
  });

  it.each(allSpecs)(
    "%s stable routes are documented without orphan stable operations",
    (_name, spec, routes) => {
      const drift = compareStableRoutes([...routes], spec);
      expect(drift.undocumented).toEqual([]);
    },
  );
});

describe("gateway path rewriting", () => {
  it("rewrites chat service paths to /api/v1/chat", () => {
    const rewritten = rewriteServiceSpecForGateway(chatOpenApiSpec, {
      service: "chat",
      publicPrefix: "/api/v1/chat",
      rewritePrefix: "/api/v1",
    });

    expect(rewritten.paths["/api/v1/chat/conversations"]).toBeDefined();
    expect(rewritten.paths["/api/v1/chat/messages/send"]).toBeDefined();
  });

  it("rewrites ai service paths to /api/v1/ai", () => {
    const rewritten = rewriteServiceSpecForGateway(aiOpenApiSpec, {
      service: "ai",
      publicPrefix: "/api/v1/ai",
      rewritePrefix: "/api/v1",
    });

    expect(rewritten.paths["/api/v1/ai/execute"]).toBeDefined();
    expect(rewritten.paths["/api/v1/ai/stream"]).toBeDefined();
  });
});

describe("merged gateway spec", () => {
  it("includes all implemented domains and excludes deferred admin/analytics/notification", () => {
    const merged = mergeOpenApiSpecs(
      [
        {
          service: "auth",
          spec: authOpenApiSpec,
          rewrite: {
            service: "auth",
            publicPrefix: "/api/v1/auth",
            rewritePrefix: "/api/v1/auth",
          },
        },
        {
          service: "chat",
          spec: chatOpenApiSpec,
          rewrite: {
            service: "chat",
            publicPrefix: "/api/v1/chat",
            rewritePrefix: "/api/v1",
          },
        },
      ],
      {
        title: "Gateway",
        version: "1.0.0",
      },
    );

    const paths = Object.keys(merged.spec.paths).join(" ");
    expect(paths).toContain("/api/v1/auth/login");
    expect(paths).toContain("/api/v1/chat/messages/send");
    expect(paths).not.toMatch(/admin/i);
    expect(paths).not.toMatch(/analytics/i);
    expect(paths).not.toMatch(/notification/i);
    expect(assertUniqueOperationIds(merged.spec)).toEqual([]);
  });
});
