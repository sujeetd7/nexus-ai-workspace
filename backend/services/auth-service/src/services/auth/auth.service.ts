import {
  AuthResponse,
  JwtPayload,
  LoginInput,
  RegisterInput,
  User,
  UserResponse,
} from "../../types/interfaces/auth.interface";

import { IUserRepository }
  from "../../types/interfaces/user.repository.interface";

import { authRepository }
  from "../../repositories/auth/auth.repository";

import {
  PasswordService,
  passwordService,
} from "../../password/password.service";

import {
  JwtService,
  jwtService,
} from "../../tokens/access/jwt.service";

import { ApiError }
  from "../../middleware/error/api-error";

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: JwtService
  ) {}

  async register(
    input: RegisterInput
  ): Promise<AuthResponse> {
    const existingUser =
      await this.users.findByEmail(input.email);

    if (existingUser) {
      throw new ApiError(
        409,
        "EMAIL_EXISTS",
        "An account already exists for this email address."
      );
    }

    const passwordHash =
      await this.passwords.hash(input.password);

    const user = await this.users.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    return this.toAuthResponse(user);
  }

  async login(
    input: LoginInput
  ): Promise<AuthResponse> {
    const user =
      await this.users.findByEmail(input.email);

    if (!user) {
      throw this.invalidCredentialsError();
    }

    const passwordMatches =
      await this.passwords.verify(
        input.password,
        user.passwordHash
      );

    if (!passwordMatches) {
      throw this.invalidCredentialsError();
    }

    return this.toAuthResponse(user);
  }

  async refresh(
    token: string
  ): Promise<AuthResponse> {
    const payload =
      this.verifyRefreshToken(token);

    const user =
      await this.users.findById(payload.sub);

    if (!user) {
      throw new ApiError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or has expired."
      );
    }

    return this.toAuthResponse(user);
  }

 async logout(
  _userId: string
): Promise<void> {
  return;
}

  private sanitizeUser(
  user: User
) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

  private toAuthResponse(
    user: User
  ): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

   return {
  user: this.sanitizeUser(user),
  tokens: {
        accessToken:
          this.tokens.generateAccessToken(payload),
        refreshToken:
          this.tokens.generateRefreshToken(payload),
      },
    };
  }

  private verifyRefreshToken(
    token: string
  ): JwtPayload {
    try {
      return this.tokens.verifyRefreshToken(token);
    } catch {
      throw new ApiError(
        401,
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or has expired."
      );
    }
  }

  private invalidCredentialsError(): ApiError {
    return new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect."
    );
  }
}

export const authService =
  new AuthService(
    authRepository,
    passwordService,
    jwtService
  );
