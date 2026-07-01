import request from "supertest";

import app from "../../src/app";

describe("Auth API", () => {
  test("POST /auth/register", async () => {
    console.log("before request");
    const response = await request(app).post("/api/v1/auth/register").send({
      email: "integration@test.com",

      password: "Password@123",

      firstName: "John",

      lastName: "Doe",
    });

    console.log("after request");
    expect(response.status).toBe(201);

    expect(response.body.user.email).toBe("integration@test.com");

    expect(response.body.tokens.accessToken).toBeDefined();

    expect(response.body.tokens.refreshToken).toBeDefined();
  });
});
