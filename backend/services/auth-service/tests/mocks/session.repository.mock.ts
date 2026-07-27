import { ISessionRepository } from "../../src/types/interfaces/session.repository.interface";
import { Session } from "../../src/types/interfaces/session.interface";
import { SessionRotationConflictError } from "../../src/repositories/prisma/session-rotation.error";

export const sessionRepositoryMock: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  findActiveByTokenHash: jest.fn(),
  findByTokenHash: jest.fn(),
  findAnyByTokenHash: jest.fn(),
  revoke: jest.fn(),
  revokeUserSessions: jest.fn(),
  findByUserId: jest.fn(),
  revokeUserSession: jest.fn(),
  revokeAsRotated: jest.fn(),
  touch: jest.fn(),
  rotateSession: jest.fn(),
};

export function buildSession(overrides: Partial<Session> = {}): Session {
  const now = new Date();

  return {
    id: "session-1",
    userId: "user-1",
    refreshTokenHash: "hash-1",
    createdAt: now,
    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    rotated: false,
    deviceName: "test-device",
    ipAddress: "127.0.0.1",
    userAgent: "jest",
    lastUsedAt: now,
    ...overrides,
  };
}

export { SessionRotationConflictError };
