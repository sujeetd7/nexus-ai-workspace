import { prisma } from "@db";

import {
  CreateUserInput,
  IUserRepository,
} from "../../types/interfaces/user.repository.interface";

import { User } from "../../types/interfaces/auth.interface";

import { UserRole } from "@prisma/client";

export class AuthPrismaRepository implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: {
        email,
      },
    })) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return (await prisma.user.findUnique({
      where: {
        id,
      },
    })) as User | null;
  }

  async create(input: CreateUserInput): Promise<User> {
    return (await prisma.user.create({
      data: {
        email: input.email,

        passwordHash: input.passwordHash,

        role: input.role ?? UserRole.USER,

        firstName: input.firstName,

        lastName: input.lastName,

        emailVerified: false,

        isActive: true,

        failedLoginAttempts: input.failedLoginAttempts,

        lockedUntil: input.lockedUntil,
      },
    })) as User;
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return (await prisma.user.update({
      where: { id },

      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerified: data.emailVerified,
        isActive: data.isActive,
        failedLoginAttempts: data.failedLoginAttempts,
        lockedUntil: data.lockedUntil,
        updatedAt: new Date(),
      },
    })) as User;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: {
        id,
      },
    });
  }

  async incrementFailedAttempts(userId: string): Promise<User> {
    return (await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        failedLoginAttempts: {
          increment: 1,
        },

        updatedAt: new Date(),
      },
    })) as User;
  }

  async resetFailedAttempts(userId: string): Promise<User> {
    return (await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        failedLoginAttempts: 0,

        lockedUntil: null,

        updatedAt: new Date(),
      },
    })) as User;
  }

  async lockUser(userId: string, until: Date): Promise<User> {
    return (await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        lockedUntil: until,

        updatedAt: new Date(),
      },
    })) as User;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        emailVerified: true,

        updatedAt: new Date(),
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        passwordHash,

        failedLoginAttempts: 0,

        lockedUntil: null,

        updatedAt: new Date(),
      },
    });
  }
}
