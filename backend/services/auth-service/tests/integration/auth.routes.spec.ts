import request from "supertest";
import createApp from "../../src/app";

describe("Auth API", () => {
  const app = createApp();

  test("POST /api/v1/auth/refresh rejects missing refreshToken", async () => {
    const response = await request(app).post("/api/v1/auth/refresh").send({});

    expect(response.status).toBe(400);
  });

  test("POST /api/v1/auth/logout requires authentication", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "not-a-real-token" });

    expect(response.status).toBe(401);
  });

  test("duplicate session router is not mounted at POST /logout-all", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout-all")
      .send({});

    expect(response.status).toBe(404);
  });
});
