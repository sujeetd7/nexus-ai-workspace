import { EmailVerification } from "./email-verification.interface";

export interface CreateEmailVerificationInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IEmailVerificationRepository {
  create(input: CreateEmailVerificationInput): Promise<EmailVerification>;

  findByTokenHash(tokenHash: string): Promise<EmailVerification | null>;

  findByUserId(userId: string): Promise<EmailVerification[]>;

  markUsed(id: string): Promise<EmailVerification>;

  invalidateUserTokens(userId: string): Promise<void>;

  deleteExpired(now: Date): Promise<number>;
}
