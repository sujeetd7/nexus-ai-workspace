import { prisma } from "@db";
import type {
  IPasswordResetRepository,
  PasswordResetToken,
} from "@shared-types/interfaces/password-reset.repository.interface";

export class PasswordResetPrismaRepository implements IPasswordResetRepository {
  async create(
    token: Omit<PasswordResetToken, "id">,
  ): Promise<PasswordResetToken> {
    return await prisma.passwordReset.create({
      data: {
        userId: token.userId,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        used: token.used,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return await prisma.passwordReset.findUnique({
      where: {
        tokenHash,
      },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.passwordReset.update({
      where: {
        id,
      },
      data: {
        used: true,
      },
    });
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await prisma.passwordReset.updateMany({
      where: {
        userId,
        used: false,
      },
      data: {
        used: true,
      },
    });
  }

  async deleteExpired(): Promise<void> {
    await prisma.passwordReset.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}

export const passwordResetRepository = new PasswordResetPrismaRepository();
