import { ROUTE_MAP } from "../../src/plugins/create-proxy";
import { env } from "../../src/config/env";

describe("G1 packaging contract", () => {
  it("canonical package identity is @nexus/api-gateway", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require("../../package.json");
    expect(pkg.name).toBe("@nexus/api-gateway");
    expect(pkg.private).toBe(true);
  });
});

describe("G2 port / upstream defaults", () => {
  it("uses conflict-free Document 3004 / Kernel 3010 defaults", () => {
    expect(env.DOCUMENT_SERVICE_URL).toContain(":3004");
    expect(env.AI_KERNEL_URL).toContain(":3010");
    expect(env.AUTH_SERVICE_URL).toContain(":3001");
    expect(env.WORKSPACE_SERVICE_URL).toContain(":3002");
    expect(env.USER_SERVICE_URL).toContain(":3003");
    expect(env.PROMPT_SERVICE_URL).toContain(":3005");
    expect(env.CHAT_SERVICE_URL).toContain(":3006");
    expect(env.AI_SERVICE_URL).toContain(":3007");
    expect(env.AGENT_SERVICE_URL).toContain(":3008");
  });

  it("does not configure Admin/Analytics/Notification upstreams", () => {
    expect((env as any).ADMIN_SERVICE_URL).toBeUndefined();
    expect((env as any).ANALYTICS_SERVICE_URL).toBeUndefined();
    expect((env as any).NOTIFICATION_SERVICE_URL).toBeUndefined();
  });
});

describe("G3 route mapping table", () => {
  it("maps every implemented service with explicit rewritePrefix", () => {
    const services = ROUTE_MAP.map((r) => r.service);
    expect(services).toEqual([
      "auth",
      "users",
      "workspaces",
      "documents",
      "prompts",
      "chat",
      "ai",
      "agents",
      "kernel",
    ]);

    for (const route of ROUTE_MAP) {
      expect(route.publicPrefix).toMatch(/^\/api\/v1\//);
      expect(route.rewritePrefix).toMatch(/^\/api\/v1/);
    }
  });

  it("preserves resource prefixes for users/workspaces/documents/prompts/agents/auth/kernel", () => {
    const preserve = ROUTE_MAP.filter((r) =>
      ["auth", "users", "workspaces", "documents", "prompts", "agents", "kernel"].includes(
        r.service,
      ),
    );
    for (const route of preserve) {
      expect(route.rewritePrefix).toBe(route.publicPrefix);
    }
  });

  it("rewrites chat and ai public prefixes to /api/v1 service roots", () => {
    const chat = ROUTE_MAP.find((r) => r.service === "chat")!;
    const ai = ROUTE_MAP.find((r) => r.service === "ai")!;
    expect(chat.publicPrefix).toBe("/api/v1/chat");
    expect(chat.rewritePrefix).toBe("/api/v1");
    expect(ai.publicPrefix).toBe("/api/v1/ai");
    expect(ai.rewritePrefix).toBe("/api/v1");
  });
});
