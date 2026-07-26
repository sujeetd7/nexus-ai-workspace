import { randomUUID } from "crypto";

import { PasswordReset } from "../../types/interfaces/password-reset.interface";

import { IPasswordResetRepository } from "../../types/interfaces/password-reset.repository.interface";

export class PasswordResetRepository implements IPasswordResetRepository {
  private resets = new Map<string, PasswordReset>();

  async create(reset: Omit<PasswordReset, "id">): Promise<PasswordReset> {
    const entity = {
      id: randomUUID(),
      ...reset,
    };

    this.resets.set(entity.id, entity);

    return entity;
  }

  async findByTokenHash(tokenHash: string) {
    for (const reset of this.resets.values()) {
      if (reset.tokenHash === tokenHash) {
        return reset;
      }
    }

    return null;
  }

  async findByUserId(userId: string) {
    return Array.from(this.resets.values()).filter(
      (reset) => reset.userId === userId,
    );
  }

  async markUsed(id: string) {
    const reset = this.resets.get(id);

    if (reset) {
      reset.used = true;

      this.resets.set(id, reset);
    }
  }

  async invalidateUserTokens(userId: string) {
    for (const reset of this.resets.values()) {
      if (reset.userId === userId) {
        reset.used = true;
      }
    }
  }

  async deleteExpired() {
    const now = new Date();

    for (const reset of this.resets.values()) {
      if (reset.expiresAt < now) {
        this.resets.delete(reset.id);
      }
    }
  }
}

export const passwordResetRepository = new PasswordResetRepository();
