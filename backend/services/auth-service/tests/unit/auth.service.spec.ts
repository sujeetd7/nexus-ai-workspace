import { AuthService } from "../../src/services/auth/auth.service";
import { passwordService } from "../../src/password/password.service";
import { JwtService } from "../../src/tokens/access/jwt.service";
import { ApiError } from "../../src/middleware/error/api-error";
import { hashService } from "../../src/security/hash/hash.service";
import { UserRole } from "../../src/types/auth/roles";
import { userRepositoryMock } from "../mocks/user.repository.mock";
import { userFixture } from "../fixtures/user.fixture";
import {
  buildSession,
  sessionRepositoryMock,
  SessionRotationConflictError,
} from "../mocks/session.repository.mock";
import {
  emailVerificationPublisherMock,
  emailVerificationRepositoryMock,
  passwordResetRepositoryMock,
  secureTokenServiceMock,
} from "../mocks/auth.deps.mock";

jest.mock("../../src/security/audit/audit.service", () => ({
  AuditEvent: {
    LOGIN_SUCCESS: "LOGIN_SUCCESS",
    LOGIN_FAILED: "LOGIN_FAILED",
    ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
    TOKEN_REFRESH: "TOKEN_REFRESH",
    TOKEN_REPLAY: "TOKEN_REPLAY",
    LOGOUT: "LOGOUT",
    LOGOUT_ALL: "LOGOUT_ALL",
    EMAIL_VERIFICATION_SENT: "EMAIL_VERIFICATION_SENT",
    EMAIL_VERIFIED: "EMAIL_VERIFIED",
    EMAIL_VERIFICATION_FAILED: "EMAIL_VERIFICATION_FAILED",
    PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
    PASSWORD_RESET_UNKNOWN_EMAIL: "PASSWORD_RESET_UNKNOWN_EMAIL",
    PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  },
  auditService: {
    log: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("AuthService", () => {
  let service: AuthService;
  let testJwtService: JwtService;
  let tokenIdGenerator: jest.Mock<string, []>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);

    let tokenIdSeq = 0;
    tokenIdGenerator = jest.fn(() => {
      tokenIdSeq += 1;
      return `test-jti-${tokenIdSeq}`;
    });
    testJwtService = new JwtService(tokenIdGenerator);

    sessionRepositoryMock.create.mockResolvedValue(buildSession());
    emailVerificationRepositoryMock.create.mockResolvedValue({
      id: "ev-1",
      userId: userFixture.id,
      tokenHash: "x",
      expiresAt: new Date(),
      used: false,
      createdAt: new Date(),
    });

    service = new AuthService(
      userRepositoryMock as any,
      passwordService,
      testJwtService,
      sessionRepositoryMock,
      emailVerificationRepositoryMock as any,
      passwordResetRepositoryMock as any,
      secureTokenServiceMock as any,
      emailVerificationPublisherMock as any,
    );
  });

  afterEach(() => {
    consoleSpy.mockRestore();
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
    expect(sessionRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userFixture.id,
        refreshTokenHash: expect.any(String),
        revoked: false,
      }),
    );

    const persistedHash =
      sessionRepositoryMock.create.mock.calls[0][0].refreshTokenHash;
    expect(persistedHash).toBe(hashService.sha256(result.tokens.refreshToken));
    expect(persistedHash).not.toBe(result.tokens.refreshToken);
  });

  describe("refresh token uniqueness", () => {
    test("identical claims produce distinct refresh tokens with distinct jti", () => {
      const claims = {
        sub: userFixture.id,
        email: userFixture.email,
        role: UserRole.USER,
      };

      const first = testJwtService.generateRefreshToken(claims);
      const second = testJwtService.generateRefreshToken(claims);

      expect(first).not.toBe(second);

      const firstPayload = testJwtService.verifyRefreshToken(first);
      const secondPayload = testJwtService.verifyRefreshToken(second);

      expect(firstPayload.jti).toBeDefined();
      expect(secondPayload.jti).toBeDefined();
      expect(firstPayload.jti).not.toBe(secondPayload.jti);
      expect(firstPayload.sub).toBe(claims.sub);
      expect(secondPayload.sub).toBe(claims.sub);
      expect(firstPayload.email).toBe(claims.email);
      expect(firstPayload.role).toBe(claims.role);
    });
  });

  describe("refresh rotation", () => {
    function issueRefreshToken(userId = userFixture.id) {
      return testJwtService.generateRefreshToken({
        sub: userId,
        email: userFixture.email,
        role: UserRole.USER,
      });
    }

    test("active refresh succeeds, rotates session, and links replacement hash", async () => {
      const refreshToken = issueRefreshToken();
      const tokenHash = hashService.sha256(refreshToken);
      const active = buildSession({
        id: "old-session",
        refreshTokenHash: tokenHash,
      });

      userRepositoryMock.findById.mockResolvedValue(userFixture);
      sessionRepositoryMock.findActiveByTokenHash.mockResolvedValue(active);
      sessionRepositoryMock.rotateSession.mockImplementation(async (input) => ({
        oldSessionId: input.oldSessionId,
        newSession: buildSession({
          id: "new-session",
          refreshTokenHash: input.newRefreshTokenHash,
          replacedByToken: undefined,
        }),
      }));

      const result = await service.refresh(refreshToken);

      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.tokens.refreshToken).not.toBe(refreshToken);

      const oldPayload = testJwtService.verifyRefreshToken(refreshToken);
      const newPayload = testJwtService.verifyRefreshToken(
        result.tokens.refreshToken,
      );
      expect(newPayload.jti).toBeDefined();
      expect(newPayload.jti).not.toBe(oldPayload.jti);

      expect(sessionRepositoryMock.rotateSession).toHaveBeenCalledWith(
        expect.objectContaining({
          oldSessionId: "old-session",
          userId: userFixture.id,
          newRefreshTokenHash: hashService.sha256(result.tokens.refreshToken),
        }),
      );

      const rotateArg = sessionRepositoryMock.rotateSession.mock.calls[0][0];
      expect(rotateArg.newRefreshTokenHash).not.toBe(
        result.tokens.refreshToken,
      );
      expect(rotateArg.newRefreshTokenHash).not.toBe(tokenHash);
    });

    test("reuse of rotated token is rejected, revokes all user sessions, and issues no tokens", async () => {
      const refreshToken = issueRefreshToken();
      const tokenHash = hashService.sha256(refreshToken);

      sessionRepositoryMock.findActiveByTokenHash.mockResolvedValue(null);
      sessionRepositoryMock.findAnyByTokenHash.mockResolvedValue(
        buildSession({
          id: "rotated-session",
          refreshTokenHash: tokenHash,
          revoked: true,
          rotated: true,
          revokedReason: "ROTATED",
        }),
      );
      sessionRepositoryMock.revokeUserSessions.mockResolvedValue(undefined);

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_REFRESH_TOKEN",
      });

      expect(sessionRepositoryMock.revokeUserSessions).toHaveBeenCalledWith(
        userFixture.id,
        "TOKEN_REPLAY",
      );
      expect(sessionRepositoryMock.rotateSession).not.toHaveBeenCalled();
    });

    test("concurrent rotation conflict is treated as replay", async () => {
      const refreshToken = issueRefreshToken();
      const tokenHash = hashService.sha256(refreshToken);
      const active = buildSession({
        id: "old-session",
        refreshTokenHash: tokenHash,
      });

      userRepositoryMock.findById.mockResolvedValue(userFixture);
      sessionRepositoryMock.findActiveByTokenHash.mockResolvedValue(active);
      sessionRepositoryMock.rotateSession.mockRejectedValue(
        new SessionRotationConflictError(),
      );
      sessionRepositoryMock.revokeUserSessions.mockResolvedValue(undefined);

      await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(
        ApiError,
      );
      expect(sessionRepositoryMock.revokeUserSessions).toHaveBeenCalledWith(
        userFixture.id,
        "TOKEN_REPLAY",
      );
    });

    test("expired persisted session is rejected without mass revoke", async () => {
      const refreshToken = issueRefreshToken();
      const tokenHash = hashService.sha256(refreshToken);

      sessionRepositoryMock.findActiveByTokenHash.mockResolvedValue(null);
      sessionRepositoryMock.findAnyByTokenHash.mockResolvedValue(
        buildSession({
          refreshTokenHash: tokenHash,
          revoked: false,
          rotated: false,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        code: "INVALID_REFRESH_TOKEN",
      });
      expect(sessionRepositoryMock.revokeUserSessions).not.toHaveBeenCalled();
    });

    test("unknown token without session row is rejected", async () => {
      const refreshToken = issueRefreshToken();

      sessionRepositoryMock.findActiveByTokenHash.mockResolvedValue(null);
      sessionRepositoryMock.findAnyByTokenHash.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toMatchObject({
        code: "INVALID_REFRESH_TOKEN",
      });
      expect(sessionRepositoryMock.revokeUserSessions).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    test("current-session logout revokes only the matching active session", async () => {
      const refreshToken = testJwtService.generateRefreshToken({
        sub: userFixture.id,
        email: userFixture.email,
        role: UserRole.USER,
      });
      const session = buildSession({
        id: "session-to-revoke",
        refreshTokenHash: hashService.sha256(refreshToken),
      });

      sessionRepositoryMock.findAnyByTokenHash.mockResolvedValue(session);
      sessionRepositoryMock.revoke.mockResolvedValue(undefined);

      await service.logout(refreshToken);

      expect(sessionRepositoryMock.revoke).toHaveBeenCalledWith(
        "session-to-revoke",
        "LOGOUT",
      );
      expect(sessionRepositoryMock.revokeUserSessions).not.toHaveBeenCalled();
    });

    test("repeat logout is idempotent when session already revoked", async () => {
      const refreshToken = "any-token";
      sessionRepositoryMock.findAnyByTokenHash.mockResolvedValue(
        buildSession({ revoked: true }),
      );

      await expect(service.logout(refreshToken)).resolves.toBeUndefined();
      expect(sessionRepositoryMock.revoke).not.toHaveBeenCalled();
    });

    test("logout-all revokes all active sessions for the user", async () => {
      sessionRepositoryMock.revokeUserSessions.mockResolvedValue(undefined);

      await service.logoutAll(userFixture.id);

      expect(sessionRepositoryMock.revokeUserSessions).toHaveBeenCalledWith(
        userFixture.id,
        "LOGOUT_ALL",
      );
    });
  });

  test("does not log raw refresh tokens or JWT secrets", async () => {
    userRepositoryMock.findByEmail.mockResolvedValue(null);
    userRepositoryMock.create.mockResolvedValue(userFixture);

    const result = await service.register({
      email: "test@test.com",
      password: "Password@123",
    });

    const logged = consoleSpy.mock.calls.flat().map(String).join(" ");
    expect(logged).not.toContain(result.tokens.refreshToken);
    expect(logged).not.toContain(result.tokens.accessToken);
    expect(logged).not.toContain("development-secret");
    expect(logged).not.toContain("development-refresh-secret");
    expect(logged).not.toContain("test-jti-");
  });
});
