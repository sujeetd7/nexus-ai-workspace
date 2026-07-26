import { Session } from "./session.interface";

export interface ISessionRepository {
  create(session: Omit<Session, "id">): Promise<Session>;

  findByTokenHash(hash: string): Promise<Session | null>;

  findAnyByTokenHash(hash: string): Promise<Session | null>;

  revoke(id: string): Promise<void>;

  revokeUserSessions(userId: string): Promise<void>;

  findByUserId(userId: string): Promise<Session[]>;

  revokeUserSession(userId: string, sessionId: string): Promise<void>;

  revokeAsRotated(sessionId: string): Promise<void>;

  touch(sessionId: string, usedAt: Date): Promise<void>;
}
