import http from "http";
import { AddressInfo } from "net";
import jwt from "jsonwebtoken";

/**
 * Integration tests for the canonical Gateway.
 * Spins a fixture upstream + Fastify Gateway (no real product services).
 */

const ACCESS_SECRET = "development-secret";

function signAccessToken(claims: { sub: string; role?: string; email?: string }) {
  return jwt.sign(claims, ACCESS_SECRET, { expiresIn: "15m" });
}

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return (server.address() as AddressInfo).port;
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe("Gateway proxy integration", () => {
  let upstream: http.Server;
  let upstreamPort: number;
  let app: any;
  let lastUpstream: {
    method?: string;
    url?: string;
    headers?: http.IncomingHttpHeaders;
    body?: string;
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
    process.env.PROXY_BODY_LIMIT = String(1024 * 64);

    lastUpstream = {};

    upstream = http.createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);

      lastUpstream = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: body.toString("utf8"),
      };

      const url = req.url ?? "";

      if (url.startsWith("/api/v1/stream-sse")) {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write('data: {"type":"chunk","n":1}\n\n');
        res.write('data: {"type":"done"}\n\n');
        res.end();
        return;
      }

      if (url.startsWith("/api/v1/documents/upload") && req.method === "POST") {
        const contentType = String(req.headers["content-type"] ?? "");
        if (!contentType.includes("multipart/form-data")) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: "validation_error", message: "multipart required" }));
          return;
        }
        if (body.length > 1024 * 32) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ code: "payload_too_large", message: "too large" }));
          return;
        }
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: true,
            bytes: body.length,
            boundaryPreserved: contentType.includes("boundary="),
          }),
        );
        return;
      }

      if (url.includes("/force-status/")) {
        const status = Number(url.split("/force-status/")[1]?.split("?")[0]);
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ code: `upstream_${status}`, message: `status ${status}` }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          method: req.method,
          path: url,
          query: url.includes("?") ? url.split("?")[1] : "",
          body: body.length ? body.toString("utf8") : null,
          authorization: req.headers.authorization ?? null,
          userId: req.headers["x-user-id"] ?? null,
          userRole: req.headers["x-user-role"] ?? null,
          requestId: req.headers["x-request-id"] ?? null,
          correlationId: req.headers["x-correlation-id"] ?? null,
        }),
      );
    });

    upstreamPort = await listen(upstream);
    const origin = `http://127.0.0.1:${upstreamPort}`;

    process.env.AUTH_SERVICE_URL = origin;
    process.env.USER_SERVICE_URL = origin;
    process.env.WORKSPACE_SERVICE_URL = origin;
    process.env.DOCUMENT_SERVICE_URL = origin;
    process.env.PROMPT_SERVICE_URL = origin;
    process.env.CHAT_SERVICE_URL = origin;
    process.env.AI_SERVICE_URL = origin;
    process.env.AGENT_SERVICE_URL = origin;
    process.env.AI_KERNEL_URL = origin;

    // Re-require modules after env mutation
    jest.resetModules();
    const { buildApp } = await import("../../src/app");
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await close(upstream);
  });

  beforeEach(() => {
    lastUpstream = {};
  });

  describe("health / readiness", () => {
    it("GET /health returns gateway liveness", async () => {
      const res = await app.inject({ method: "GET", url: "/health" });
      expect(res.statusCode).toBe(200);
      expect(res.json().service).toBe("api-gateway");
      expect(res.json().status).toBe("healthy");
    });

    it("GET /readiness includes only implemented services", async () => {
      const res = await app.inject({ method: "GET", url: "/readiness" });
      expect([200, 503]).toContain(res.statusCode);
      const body = res.json();
      const names = body.upstreams.map((u: any) => u.name);
      expect(names).toEqual([
        "auth",
        "user",
        "workspace",
        "document",
        "prompt",
        "ai",
        "chat",
        "agent",
        "ai-kernel",
      ]);
      expect(names).not.toContain("admin");
      expect(names).not.toContain("analytics");
      expect(names).not.toContain("notification");
    });
  });

  describe("auth + identity", () => {
    it("public auth route works without token", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "a@b.com", password: "x" },
      });
      expect(res.statusCode).toBe(200);
      expect(lastUpstream.url).toBe("/api/v1/auth/login");
    });

    it("protected route without token → 401", async () => {
      const res = await app.inject({ method: "GET", url: "/api/v1/users" });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe("unauthorized");
    });

    it("protected route with invalid token → 401", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: { authorization: "Bearer not-a-token" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("valid token forwards Authorization and injects verified identity", async () => {
      const token = signAccessToken({
        sub: "user-42",
        role: "DEVELOPER",
        email: "u@example.com",
      });

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/user-42?include=profile",
        headers: {
          authorization: `Bearer ${token}`,
          "x-user-id": "spoofed-attacker",
          "x-user-role": "OWNER",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.authorization).toBe(`Bearer ${token}`);
      expect(body.userId).toBe("user-42");
      expect(body.userRole).toBe("DEVELOPER");
      expect(lastUpstream.headers?.["x-user-id"]).toBe("user-42");
      expect(lastUpstream.headers?.["x-user-role"]).toBe("DEVELOPER");
      expect(lastUpstream.headers?.["x-user-id"]).not.toBe("spoofed-attacker");
    });
  });

  describe("route preservation", () => {
    const token = () => signAccessToken({ sub: "u1", role: "ADMIN" });

    it.each([
      ["/api/v1/workspaces/ws-1/members", "/api/v1/workspaces/ws-1/members"],
      ["/api/v1/documents/doc-9", "/api/v1/documents/doc-9"],
      ["/api/v1/prompts/p-1/executions", "/api/v1/prompts/p-1/executions"],
      ["/api/v1/agents/a-1", "/api/v1/agents/a-1"],
      ["/api/v1/kernel/execute", "/api/v1/kernel/execute"],
      ["/api/v1/chat/conversations", "/api/v1/conversations"],
      ["/api/v1/ai/stream", "/api/v1/stream"],
    ])("%s → upstream %s", async (publicPath, upstreamPath) => {
      const res = await app.inject({
        method: "GET",
        url: publicPath,
        headers: { authorization: `Bearer ${token()}` },
      });
      expect(res.statusCode).toBe(200);
      expect(lastUpstream.url?.split("?")[0]).toBe(upstreamPath);
      expect(lastUpstream.method).toBe("GET");
    });

    it("preserves method, query, and JSON body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/workspaces?dryRun=1",
        headers: {
          authorization: `Bearer ${token()}`,
          "content-type": "application/json",
        },
        payload: { name: "Nexus" },
      });
      expect(res.statusCode).toBe(200);
      expect(lastUpstream.method).toBe("POST");
      expect(lastUpstream.url).toBe("/api/v1/workspaces?dryRun=1");
      expect(lastUpstream.body).toContain("Nexus");
    });
  });

  describe("correlation", () => {
    it("reuses incoming request ID", async () => {
      const token = signAccessToken({ sub: "u1" });
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: {
          authorization: `Bearer ${token}`,
          "x-request-id": "req-incoming-001",
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["x-request-id"]).toBe("req-incoming-001");
      expect(res.headers["x-correlation-id"]).toBe("req-incoming-001");
      expect(lastUpstream.headers?.["x-request-id"]).toBe("req-incoming-001");
      expect(lastUpstream.headers?.["x-correlation-id"]).toBe("req-incoming-001");
    });

    it("generates correlation ID when missing", async () => {
      const token = signAccessToken({ sub: "u1" });
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["x-request-id"]).toBeTruthy();
      expect(res.headers["x-correlation-id"]).toBe(res.headers["x-request-id"]);
    });
  });

  describe("upstream status preservation", () => {
    it.each([400, 401, 403, 404, 409, 413, 423, 429])(
      "preserves upstream %s",
      async (status) => {
        const token = signAccessToken({ sub: "u1" });
        const res = await app.inject({
          method: "GET",
          url: `/api/v1/users/force-status/${status}`,
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(status);
        expect(res.json().code).toBe(`upstream_${status}`);
      },
    );

    it("preserves upstream 5xx", async () => {
      const token = signAccessToken({ sub: "u1" });
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/users/force-status/503",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(503);
      const text = res.body;
      expect(text).not.toMatch(/127\.0\.0\.1/);
      expect(text).not.toMatch(/stack/i);
    });
  });

  describe("upstream unavailable", () => {
    it("returns normalized 502 when upstream refuses connection", async () => {
      process.env.USER_SERVICE_URL = "http://127.0.0.1:1";
      jest.resetModules();
      const { buildApp } = await import("../../src/app");
      const isolated = await buildApp({ logger: false });
      await isolated.ready();

      try {
        const token = signAccessToken({ sub: "u1" });
        const res = await isolated.inject({
          method: "GET",
          url: "/api/v1/users",
          headers: { authorization: `Bearer ${token}` },
        });
        expect([502, 503, 504]).toContain(res.statusCode);
        expect(res.json().error?.code ?? res.json().code).toMatch(/upstream_/);
        expect(res.body).not.toMatch(/127\.0\.0\.1:1/);
        expect(res.body).not.toMatch(/stack/i);
      } finally {
        await isolated.close();
        process.env.USER_SERVICE_URL = `http://127.0.0.1:${upstreamPort}`;
      }
    });
  });

  describe("multipart", () => {
    it("preserves multipart boundary and content", async () => {
      const token = signAccessToken({ sub: "u1" });
      const boundary = "----NexusBoundary7MA4YWxkTrZu0gW";
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="note.txt"',
        "Content-Type: text/plain",
        "",
        "hello nexus",
        `--${boundary}--`,
        "",
      ].join("\r\n");

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/documents/upload",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().boundaryPreserved).toBe(true);
      expect(lastUpstream.headers?.["content-type"]).toContain(boundary);
      expect(lastUpstream.body).toContain("hello nexus");
      expect(lastUpstream.body).toContain("note.txt");
    });
  });

  describe("SSE", () => {
    it("preserves text/event-stream without buffering event boundaries", async () => {
      const token = signAccessToken({ sub: "u1" });
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/ai/stream-sse",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        payload: { prompt: "hi" },
      });

      expect(res.statusCode).toBe(200);
      expect(String(res.headers["content-type"])).toContain("text/event-stream");
      expect(res.body).toContain('data: {"type":"chunk","n":1}');
      expect(res.body).toContain('data: {"type":"done"}');
      expect(lastUpstream.url).toBe("/api/v1/stream-sse");
    });
  });

  describe("deferred services absent", () => {
    it("does not register Admin/Analytics/Notification proxies", async () => {
      const token = signAccessToken({ sub: "u1", role: "ADMIN" });
      for (const path of ["/api/v1/admin", "/api/v1/analytics", "/api/v1/notifications"]) {
        const res = await app.inject({
          method: "GET",
          url: path,
          headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(404);
      }
    });
  });
});
