import { UserRole } from "@prisma/client";
import { User } from "./auth.interface";

export interface CreateUserInput {
  email: string;

  passwordHash: string;

  role?: UserRole;

  firstName?: string;

  lastName?: string;

  failedLoginAttempts: number;

  lockedUntil?: Date;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;

  findByEmail(email: string): Promise<User | null>;

  create(user: CreateUserInput): Promise<User>;

  update(id: string, data: Partial<User>): Promise<User>;

  delete(id: string): Promise<void>;

  incrementFailedAttempts(userId: string): Promise<User>;

  resetFailedAttempts(userId: string): Promise<User>;

  lockUser(userId: string, until: Date): Promise<User>;

  markEmailVerified(userId: string): Promise<void>;

  updatePassword(userId: string, passwordHash: string): Promise<void>;
}
