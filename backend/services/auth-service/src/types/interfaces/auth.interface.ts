import { UserRole } from "@prisma/client";

export interface User {
  id: string;

  email: string;

  passwordHash: string;

  role: UserRole;

  firstName?: string;

  lastName?: string;

  emailVerified: boolean;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
  failedLoginAttempts: number;

  lockedUntil?: Date;
}

export interface UserResponse {
  id: string;

  email: string;

  role: UserRole;

  firstName?: string;

  lastName?: string;

  emailVerified: boolean;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export interface RegisterInput {
  email: string;
  password: string;

  firstName?: string;

  lastName?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationInput {
  email: string;
}

export interface SessionContext {
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserResponse;
  tokens: TokenPair;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}
