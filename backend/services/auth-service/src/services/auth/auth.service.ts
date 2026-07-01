import {
  AuthResponse,
  JwtPayload,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  SessionContext,
  User,
  UserResponse,
  VerifyEmailInput,
} from "../../types/interfaces/auth.interface";

import { IUserRepository } from "../../types/interfaces/user.repository.interface";

import {
  PasswordService,
  passwordService,
} from "../../password/password.service";

import { JwtService, jwtService } from "../../tokens/access/jwt.service";

import { ApiError } from "../../middleware/error/api-error";

import { PasswordResetPrismaRepository } from "@prisma/password-reset.prisma.repository";
import { AuthPrismaRepository } from "@repositories/prisma/auth.prisma.repository";
import { EmailVerificationPrismaRepository } from "@repositories/prisma/email-verification.prisma.repository";
import { SessionPrismaRepository } from "@repositories/prisma/session.prisma.repository";
import { env } from "../../config/env";
import {
  EmailVerificationEventPublisher,
  emailVerificationEventPublisher,
} from "../../events/email-verification/email-verification-event.publisher";
import { emailPublisher } from "../../events/email/email.publisher";
import { AuditEvent, auditService } from "../../security/audit/audit.service";
import { hashService } from "../../security/hash/hash.service";
import { passwordResetTokenService } from "../../security/tokens/password-reset-token.service";
import {
  SecureTokenService,
  secureTokenService,
} from "../../security/tokens/secure-token.service";
import { IEmailVerificationRepository } from "../../types/interfaces/email-verification.repository.interface";

export class AuthService {
  authRepository = new AuthPrismaRepository();

  sessionRepository = new SessionPrismaRepository();

  emailVerificationRepository = new EmailVerificationPrismaRepository();

  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: JwtService,
    private readonly sessions: SessionPrismaRepository,
    private readonly emailVerifications: IEmailVerificationRepository,
    private readonly passwordResetRepository: PasswordResetPrismaRepository,
    private readonly secureTokens: SecureTokenService = secureTokenService,
    private readonly emailVerificationPublisher: EmailVerificationEventPublisher = emailVerificationEventPublisher,
  ) {}

  /*
   =====================================
   REGISTER
   =====================================
  */

  async register(
    input: RegisterInput,
    context?: SessionContext,
  ): Promise<AuthResponse> {
    const existingUser = await this.users.findByEmail(input.email);

    if (existingUser) {
      throw new ApiError(
        409,
        "EMAIL_EXISTS",
        "An account already exists for this email address.",
      );
    }

    const passwordHash = await this.passwords.hash(input.password);

    const user = await this.users.create({
      email: input.email,
      passwordHash,

      firstName: input.firstName,
      lastName: input.lastName,

      role: input.role,

      failedLoginAttempts: 0,

      lockedUntil: undefined,
    });

    await this.issueEmailVerification(user);

    return await this.toAuthResponse(user, context);
  }

  /*
   =====================================
   EMAIL VERIFICATION
   =====================================
  */

  async verifyEmail(input: VerifyEmailInput): Promise<UserResponse> {
    const tokenHash = hashService.sha256(input.token);

    const verification =
      await this.emailVerifications.findByTokenHash(tokenHash);

    if (!verification) {
      await auditService.log({
        event: AuditEvent.EMAIL_VERIFICATION_FAILED,
        metadata: { reason: "TOKEN_NOT_FOUND" },
      });

      throw this.invalidEmailVerificationTokenError();
    }

    if (verification.used) {
      await auditService.log({
        event: AuditEvent.EMAIL_VERIFICATION_FAILED,
        userId: verification.userId,
        metadata: {
          verificationId: verification.id,
          reason: "TOKEN_REPLAY",
        },
      });

      throw this.invalidEmailVerificationTokenError();
    }

    if (verification.expiresAt <= new Date()) {
      await this.emailVerifications.markUsed(verification.id);

      await auditService.log({
        event: AuditEvent.EMAIL_VERIFICATION_FAILED,
        userId: verification.userId,
        metadata: {
          verificationId: verification.id,
          reason: "TOKEN_EXPIRED",
        },
      });

      throw new ApiError(
        410,
        "EMAIL_VERIFICATION_TOKEN_EXPIRED",
        "Email verification token has expired.",
      );
    }

    const user = await this.users.findById(verification.userId);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User does not exist.");
    }

    await this.emailVerifications.markUsed(verification.id);

    const verifiedUser = await this.users.update(user.id, {
      emailVerified: true,
    });

    await auditService.log({
      event: AuditEvent.EMAIL_VERIFIED,
      userId: user.id,
      metadata: { verificationId: verification.id },
    });

    return this.sanitizeUser(verifiedUser);
  }

  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<{ message: string }> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      await auditService.log({
        event: AuditEvent.EMAIL_VERIFICATION_FAILED,
        metadata: { email: input.email, reason: "USER_NOT_FOUND" },
      });

      return this.verificationResendAcceptedResponse();
    }

    if (user.emailVerified) {
      await auditService.log({
        event: AuditEvent.EMAIL_VERIFICATION_FAILED,
        userId: user.id,
        metadata: { reason: "EMAIL_ALREADY_VERIFIED" },
      });

      return this.verificationResendAcceptedResponse();
    }

    await this.issueEmailVerification(user, { invalidateExisting: true });

    return this.verificationResendAcceptedResponse();
  }

  /*
   =====================================
   LOGIN
   =====================================
  */

  async login(
    input: LoginInput,
    context?: SessionContext,
  ): Promise<AuthResponse> {
    let user = await this.users.findByEmail(input.email);

    if (!user) {
      await auditService.log({
        event: AuditEvent.LOGIN_FAILED,
        metadata: { email: input.email, reason: "USER_NOT_FOUND" },
      });

      throw this.invalidCredentialsError();
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      await auditService.log({
        event: AuditEvent.LOGIN_FAILED,
        userId: user.id,
        metadata: { reason: "ACCOUNT_LOCKED" },
      });

      throw new ApiError(423, "ACCOUNT_LOCKED", "Account temporarily locked.");
    }

    if (user.lockedUntil && user.lockedUntil <= now) {
      user = await this.users.resetFailedAttempts(user.id);
    }

    const passwordMatches = await this.passwords.verify(
      input.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      const updatedUser = await this.users.incrementFailedAttempts(user.id);

      await auditService.log({
        event: AuditEvent.LOGIN_FAILED,
        userId: user.id,
        metadata: {
          failedLoginAttempts: updatedUser.failedLoginAttempts,
          reason: "PASSWORD_MISMATCH",
        },
      });

      if (
        updatedUser.failedLoginAttempts >= env.AUTH_MAX_FAILED_LOGIN_ATTEMPTS
      ) {
        const lockedUntil = this.calculateLockExpiration();

        await this.users.lockUser(user.id, lockedUntil);

        await auditService.log({
          event: AuditEvent.ACCOUNT_LOCKED,
          userId: user.id,
          metadata: {
            failedLoginAttempts: updatedUser.failedLoginAttempts,
            lockedUntil,
          },
        });

        throw new ApiError(
          423,
          "ACCOUNT_LOCKED",
          "Account temporarily locked.",
        );
      }

      throw this.invalidCredentialsError();
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user = await this.users.resetFailedAttempts(user.id);
    }

    await auditService.log({
      event: AuditEvent.LOGIN_SUCCESS,
      userId: user.id,
    });

    return await this.toAuthResponse(user, context);
  }

  /*
   =====================================
   REFRESH TOKEN ROTATION
   =====================================
  */

  async refresh(
    token: string,
    context?: SessionContext,
  ): Promise<AuthResponse> {
    const payload = this.verifyRefreshToken(token);

    const tokenHash = hashService.sha256(token);

    const oldSession = await this.sessions.findByTokenHash(tokenHash);

    if (!oldSession) {
      const historicalSession =
        await this.sessions.findAnyByTokenHash(tokenHash);

      if (historicalSession?.revoked) {
        await this.sessions.revokeUserSessions(payload.sub);

        await auditService.log({
          event: AuditEvent.TOKEN_REPLAY,
          userId: payload.sub,
          metadata: {
            sessionId: historicalSession.id,
            revokedReason: historicalSession.revokedReason,
          },
        });

        throw new ApiError(
          401,
          "TOKEN_REPLAY_DETECTED",
          "Refresh token reuse detected.",
        );
      }

      throw new ApiError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or has expired.",
      );
    }

    /*
      ROTATE OLD TOKEN
    */
    await this.sessions.revoke(oldSession.id);

    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, "USER_NOT_FOUND", "User does not exist.");
    }

    await this.sessions.touch(oldSession.id, new Date());

    const response = await this.toAuthResponse(user, context);

    /*
      MARK AS ROTATED
    */
    await this.sessions.revokeAsRotated(oldSession.id);

    await auditService.log({
      event: AuditEvent.TOKEN_REFRESH,
      userId: user.id,
      metadata: { sessionId: oldSession.id },
    });

    return response;
  }

  /*
   =====================================
   LOGOUT CURRENT SESSION
   =====================================
  */

  async logout(refreshToken: string): Promise<void> {
    const hash = hashService.sha256(refreshToken);

    const session = await this.sessions.findByTokenHash(hash);

    if (!session) {
      throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Session not found");
    }

    await this.sessions.revoke(session.id);

    await auditService.log({
      event: AuditEvent.LOGOUT,
      userId: session.userId,
      metadata: { sessionId: session.id },
    });
  }

  /*
   =====================================
   SESSION MANAGEMENT
   =====================================
  */

  async getSessions(userId: string) {
    return this.sessions.findByUserId(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.sessions.revokeUserSession(userId, sessionId);

    await auditService.log({
      event: AuditEvent.LOGOUT,
      userId,
      metadata: { sessionId },
    });
  }

  async logoutAll(userId: string) {
    await this.sessions.revokeUserSessions(userId);

    await auditService.log({
      event: AuditEvent.LOGOUT_ALL,
      userId,
    });
  }

  /*
   =====================================
   HELPERS
   =====================================
  */

  private sanitizeUser(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,

      firstName: user.firstName,

      lastName: user.lastName,

      emailVerified: user.emailVerified,

      isActive: user.isActive,

      createdAt: user.createdAt,

      updatedAt: user.updatedAt,
    };
  }

  private async toAuthResponse(
    user: User,
    context?: SessionContext,
  ): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokens.generateAccessToken(payload);

    const refreshToken = this.tokens.generateRefreshToken(payload);

    await this.sessions.create({
      userId: user.id,

      refreshTokenHash: hashService.sha256(refreshToken),

      createdAt: new Date(),

      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),

      revoked: false,

      deviceName: context?.deviceName ?? this.inferDeviceName(context),

      ipAddress: context?.ipAddress,

      userAgent: context?.userAgent,

      lastUsedAt: new Date(),
    });

    return {
      user: this.sanitizeUser(user),

      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  private verifyRefreshToken(token: string): JwtPayload {
    try {
      return this.tokens.verifyRefreshToken(token);
    } catch {
      throw new ApiError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or has expired.",
      );
    }
  }

  private invalidCredentialsError(): ApiError {
    return new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  private calculateLockExpiration(): Date {
    return new Date(Date.now() + env.AUTH_LOCK_DURATION_MINUTES * 60 * 1000);
  }

  private async issueEmailVerification(
    user: User,
    options: { invalidateExisting?: boolean } = {},
  ): Promise<void> {
    if (options.invalidateExisting) {
      await this.emailVerifications.invalidateUserTokens(user.id);
    }

    await this.emailVerifications.deleteExpired(new Date());

    const token = this.secureTokens.generateUrlSafeToken();
    const tokenHash = hashService.sha256(token);
    const expiresAt = new Date(
      Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.emailVerifications.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await this.emailVerificationPublisher.publishRequested({
      userId: user.id,
      email: user.email,
      verificationToken: token,
      verificationUrl: this.buildVerificationUrl(token),
      expiresAt,
    });

    await auditService.log({
      event: AuditEvent.EMAIL_VERIFICATION_SENT,
      userId: user.id,
      metadata: { expiresAt },
    });
  }

  private buildVerificationUrl(token: string): string {
    const url = new URL(env.EMAIL_VERIFICATION_BASE_URL);

    url.searchParams.set("token", token);

    return url.toString();
  }

  private invalidEmailVerificationTokenError(): ApiError {
    return new ApiError(
      400,
      "INVALID_EMAIL_VERIFICATION_TOKEN",
      "Email verification token is invalid.",
    );
  }

  private verificationResendAcceptedResponse(): { message: string } {
    return {
      message:
        "If the account exists and still requires verification, a new verification email will be sent.",
    };
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);

    /*
     * Never reveal whether
     * user exists.
     */
    if (!user) {
      await auditService.log({
        event: AuditEvent.PASSWORD_RESET_UNKNOWN_EMAIL,
        metadata: {
          email,
        },
      });

      return;
    }

    await this.passwordResetRepository.invalidateUserTokens(user.id);

    const token = passwordResetTokenService.generate();

    await this.passwordResetRepository.create({
      userId: user.id,

      tokenHash: passwordResetTokenService.hash(token),

      expiresAt: new Date(Date.now() + 15 * 60 * 1000),

      used: false,

      createdAt: new Date(),
    });

    await emailPublisher.publishVerificationEmail(user.email, token);

    await auditService.log({
      event: AuditEvent.PASSWORD_RESET_REQUESTED,
      userId: user.id,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = passwordResetTokenService.hash(token);

    const reset = await this.passwordResetRepository.findByTokenHash(tokenHash);

    if (!reset || reset.used) {
      throw new ApiError(400, "INVALID_RESET_TOKEN", "Reset token invalid");
    }

    if (reset.expiresAt < new Date()) {
      throw new ApiError(400, "RESET_TOKEN_EXPIRED", "Reset token expired");
    }

    const user = await this.users.findById(reset.userId);

    if (!user) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    const passwordHash = await this.passwords.hash(password);

    await this.users.updatePassword(user.id, passwordHash);

    await this.passwordResetRepository.markUsed(reset.id);

    /*
     * Important:
     * force logout
     * everywhere
     */
    await this.sessions.revokeUserSessions(user.id);

    await auditService.log({
      event: AuditEvent.PASSWORD_RESET_COMPLETED,
      userId: user.id,
    });
  }

  private inferDeviceName(context?: SessionContext): string | undefined {
    if (!context?.userAgent) {
      return undefined;
    }

    return context.userAgent.slice(0, 120);
  }
}

export const authService = new AuthService(
  new AuthPrismaRepository(),
  passwordService,
  jwtService,
  new SessionPrismaRepository(),
  new EmailVerificationPrismaRepository(),
  new PasswordResetPrismaRepository(),
);
