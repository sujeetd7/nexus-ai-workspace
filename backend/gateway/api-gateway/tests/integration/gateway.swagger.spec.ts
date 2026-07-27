import { buildApp } from "../../src/app";

describe("Gateway Swagger (W4)", () => {
  it("exposes canonical docs routes", async () => {
    const app = await buildApp({ logger: false });

    const json = await app.inject({ method: "GET", url: "/docs/json" });
    expect(json.statusCode).toBe(200);
    const body = json.json();
    expect(body.openapi).toMatch(/^3\.0/);
    expect(body.paths["/api/v1/auth/login"]).toBeDefined();
    expect(body.paths["/api/v1/ai/stream"]).toBeDefined();
    expect(body.paths["/api/v1/chat/messages/send"]).toBeDefined();
    expect(JSON.stringify(body.paths)).not.toMatch(/notification/i);

    const services = await app.inject({ method: "GET", url: "/docs/services" });
    expect(services.statusCode).toBe(200);
    const index = services.json();
    expect(index.services).toHaveLength(9);
    expect(index.deferred).toEqual(["admin", "analytics", "notification"]);

    const ui = await app.inject({ method: "GET", url: "/docs" });
    expect(ui.statusCode).toBe(200);

    await app.close();
  });
});
