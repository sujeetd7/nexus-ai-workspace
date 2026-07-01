import { randomUUID } from "crypto";

import { EmailVerification } from "../../types/interfaces/email-verification.interface";
import {
  CreateEmailVerificationInput,
  IEmailVerificationRepository,
} from "../../types/interfaces/email-verification.repository.interface";

export class EmailVerificationRepository implements IEmailVerificationRepository {
  private readonly verifications = new Map<string, EmailVerification>();

  async create(
    input: CreateEmailVerificationInput,
  ): Promise<EmailVerification> {
    const verification: EmailVerification = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      used: false,
      createdAt: new Date(),
    };

    this.verifications.set(verification.id, verification);

    return verification;
  }

  async findByTokenHash(tokenHash: string): Promise<EmailVerification | null> {
    for (const verification of this.verifications.values()) {
      if (verification.tokenHash === tokenHash) {
        return verification;
      }
    }

    return null;
  }

  async findByUserId(userId: string): Promise<EmailVerification[]> {
    return [...this.verifications.values()].filter(
      (verification) => verification.userId === userId,
    );
  }

  async markUsed(id: string): Promise<EmailVerification> {
    const verification = this.verifications.get(id);

    if (!verification) {
      throw new Error("Email verification token not found");
    }

    verification.used = true;

    return verification;
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    for (const verification of this.verifications.values()) {
      if (verification.userId === userId) {
        verification.used = true;
      }
    }
  }

  async deleteExpired(now: Date): Promise<number> {
    let deleted = 0;

    for (const [id, verification] of this.verifications.entries()) {
      if (verification.expiresAt <= now) {
        this.verifications.delete(id);
        deleted++;
      }
    }

    return deleted;
  }
}

export const emailVerificationRepository = new EmailVerificationRepository();
