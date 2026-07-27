import { Session } from "./session.interface";

export interface RotateSessionInput {
  oldSessionId: string;
  userId: string;
  newRefreshTokenHash: string;
  expiresAt: Date;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
  now?: Date;
}

export interface RotateSessionResult {
  oldSessionId: string;
  newSession: Session;
}

export interface ISessionRepository {
  create(session: Omit<Session, "id"> | Partial<Session>): Promise<Session>;

  /**
   * Active session only: matching hash, revoked=false, expiresAt > now.
   */
  findActiveByTokenHash(hash: string, now?: Date): Promise<Session | null>;

  /**
   * @deprecated Prefer findActiveByTokenHash — kept as active-only alias.
   */
  findByTokenHash(hash: string): Promise<Session | null>;

  /**
   * Any row for hash (active, revoked, rotated, or expired).
   */
  findAnyByTokenHash(hash: string): Promise<Session | null>;

  revoke(id: string, reason?: string): Promise<void>;

  revokeUserSessions(userId: string, reason?: string): Promise<void>;

  findByUserId(userId: string): Promise<Session[]>;

  revokeUserSession(
    userId: string,
    sessionId: string,
    reason?: string,
  ): Promise<void>;

  revokeAsRotated(sessionId: string): Promise<void>;

  touch(sessionId: string, usedAt: Date): Promise<void>;

  /**
   * Atomically claim the active session and create its replacement.
   * Throws SessionRotationConflictError if the session is no longer active.
   */
  rotateSession(input: RotateSessionInput): Promise<RotateSessionResult>;
}
