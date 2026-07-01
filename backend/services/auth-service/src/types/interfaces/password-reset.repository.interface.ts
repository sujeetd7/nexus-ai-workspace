export interface PasswordResetToken {
  id: string;

  userId: string;

  tokenHash: string;

  used: boolean;

  expiresAt: Date;

  createdAt?: Date;
}

export interface IPasswordResetRepository {
  create(token: Omit<PasswordResetToken, "id">): Promise<PasswordResetToken>;

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  markUsed(id: string): Promise<void>;

  invalidateUserTokens(userId: string): Promise<void>;

  deleteExpired(now: Date): Promise<void>;
}
