export interface PasswordReset {
  id: string;

  userId: string;

  tokenHash: string;

  expiresAt: Date;

  used: boolean;

  createdAt: Date;
}
