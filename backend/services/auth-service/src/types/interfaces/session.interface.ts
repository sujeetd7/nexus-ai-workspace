export interface Session {
  id: string;

  userId: string;

  refreshTokenHash: string;

  createdAt: Date;

  expiresAt: Date;

  revoked: boolean;

  deviceName?: string;

  ipAddress?: string;

  userAgent?: string;

  lastUsedAt?: Date;

  revokedReason?: string;

  replacedByToken?: string;

  rotated: boolean;
}
