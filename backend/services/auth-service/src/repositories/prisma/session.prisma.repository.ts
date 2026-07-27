import { prisma } from "@db";

import type { Session } from "@shared-types/interfaces/session.interface";
import type {
  ISessionRepository,
  RotateSessionInput,
  RotateSessionResult,
} from "@shared-types/interfaces/session.repository.interface";
import { SessionRotationConflictError } from "./session-rotation.error";

export class SessionPrismaRepository implements ISessionRepository {
  async create(session: Partial<Session>): Promise<Session> {
    return (await prisma.session.create({
      data: {
        userId: session.userId!,
        refreshTokenHash: session.refreshTokenHash!,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceName: session.deviceName,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt!,
        revoked: session.revoked ?? false,
        rotated: session.rotated ?? false,
        revokedReason: session.revokedReason,
        replacedByToken: session.replacedByToken,
      },
    })) as Session;
  }

  async findById(id: string): Promise<Session | null> {
    return (await prisma.session.findUnique({
      where: { id },
    })) as Session | null;
  }

  async findActiveByTokenHash(
    refreshTokenHash: string,
    now: Date = new Date(),
  ): Promise<Session | null> {
    return (await prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revoked: false,
        expiresAt: {
          gt: now,
        },
      },
    })) as Session | null;
  }

  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.findActiveByTokenHash(refreshTokenHash);
  }

  async findAnyByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return (await prisma.session.findFirst({
      where: {
        refreshTokenHash,
      },
    })) as Session | null;
  }

  async findActiveSessions(userId: string): Promise<Session[]> {
    return (await prisma.session.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })) as Session[];
  }

  async revoke(sessionId: string, reason = "REVOKED"): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });
  }

  async revokeAll(userId: string, reason = "REVOKED_ALL"): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });
  }

  async markRotated(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { rotated: true },
    });
  }

  async touch(sessionId: string, date: Date = new Date()): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: date },
    });
  }

  async deleteExpired(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async revokeUserSessions(
    userId: string,
    reason = "REVOKED_ALL",
  ): Promise<void> {
    await this.revokeAll(userId, reason);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.findActiveSessions(userId);
  }

  async revokeUserSession(
    userId: string,
    sessionId: string,
    reason = "REVOKED",
  ): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedReason: reason,
      },
    });
  }

  async revokeAsRotated(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        revoked: true,
        rotated: true,
        revokedReason: "ROTATED",
      },
    });
  }

  async rotateSession(input: RotateSessionInput): Promise<RotateSessionResult> {
    const now = input.now ?? new Date();

    return prisma.$transaction(async (tx) => {
      const claimed = await tx.session.updateMany({
        where: {
          id: input.oldSessionId,
          userId: input.userId,
          revoked: false,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          revoked: true,
          rotated: true,
          revokedReason: "ROTATED",
          replacedByToken: input.newRefreshTokenHash,
          lastUsedAt: now,
        },
      });

      if (claimed.count !== 1) {
        throw new SessionRotationConflictError();
      }

      const newSession = (await tx.session.create({
        data: {
          userId: input.userId,
          refreshTokenHash: input.newRefreshTokenHash,
          expiresAt: input.expiresAt,
          revoked: false,
          rotated: false,
          deviceName: input.deviceName,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          lastUsedAt: now,
        },
      })) as Session;

      return {
        oldSessionId: input.oldSessionId,
        newSession,
      };
    });
  }
}
