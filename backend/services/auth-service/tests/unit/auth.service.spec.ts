import { AuthService } from "../../src/services/auth/auth.service";

import { passwordService } from "../../src/password/password.service";

import { jwtService } from "../../src/tokens/access/jwt.service";

import { userRepositoryMock } from "../mocks/user.repository.mock";

import { userFixture } from "../fixtures/user.fixture";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new AuthService(
      userRepositoryMock as any,

      passwordService,

      jwtService,
    );
  });

  test("should register user", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);

    userRepositoryMock.create.mockResolvedValue(userFixture);

    const result = await service.register({
      email: "test@test.com",

      password: "Password@123",

      firstName: "John",

      lastName: "Doe",
    });

    expect(result.user.email).toBe("test@test.com");

    expect(userRepositoryMock.create).toHaveBeenCalled();
  });
});
