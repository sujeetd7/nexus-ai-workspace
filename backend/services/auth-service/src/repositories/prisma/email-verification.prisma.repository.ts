import { prisma } from "../../prisma/client";

import { EmailVerification } from "../../types/interfaces/email-verification.interface";
import {
  CreateEmailVerificationInput,
  IEmailVerificationRepository,
} from "../../types/interfaces/email-verification.repository.interface";

export class EmailVerificationPrismaRepository implements IEmailVerificationRepository {
  async create(
    input: CreateEmailVerificationInput,
  ): Promise<EmailVerification> {
    return (await prisma.emailVerification.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        used: false,
      },
    })) as EmailVerification;
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerification | null> {
    return (await prisma.emailVerification.findUnique({
      where: { tokenHash },
    })) as EmailVerification | null;
  }

  async findByUserId(userId: string): Promise<EmailVerification[]> {
    return (await prisma.emailVerification.findMany({
      where: { userId },
    })) as EmailVerification[];
  }

  async markUsed(id: string): Promise<EmailVerification> {
    return (await prisma.emailVerification.update({
      where: { id },
      data: { used: true },
    })) as EmailVerification;
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    await prisma.emailVerification.updateMany({
      where: { userId },
      data: { used: true },
    });
  }

  async deleteExpired(now: Date): Promise<number> {
    const result = await prisma.emailVerification.deleteMany({
      where: {
        expiresAt: { lte: now },
      },
    });

    return result.count;
  }
}

export const emailVerificationPrismaRepository =
  new EmailVerificationPrismaRepository();
