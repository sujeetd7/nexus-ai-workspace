export interface User {
  id: string;

  email: string;

  passwordHash: string;

  firstName?: string;

  lastName?: string;

  emailVerified: boolean;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

export interface UserResponse {
  id: string;

  email: string;

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
}

export interface LoginInput {
  email: string;
  password: string;
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
}