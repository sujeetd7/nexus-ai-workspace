import * as jwt from "jsonwebtoken";
import { authenticate } from "../../src/middleware/auth/authenticate.middleware";

describe("workspace authenticate middleware", () => {
  const secret = "development-secret";

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = secret;
  });

  function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  it("rejects missing token with 401", () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("strips spoofed x-user-id and sets auth from verified token", () => {
    const token = jwt.sign(
      { sub: "real-user", role: "DEVELOPER", email: "a@b.com" },
      secret,
    );
    const req: any = {
      headers: {
        authorization: `Bearer ${token}`,
        "x-user-id": "spoofed",
        "x-user-role": "OWNER",
      },
    };
    const res = mockRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth.userId).toBe("real-user");
    expect(req.headers["x-user-id"]).toBeUndefined();
    expect(req.user.id).toBe("real-user");
  });
});
