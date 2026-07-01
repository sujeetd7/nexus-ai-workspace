import { prisma } from "@db";

import type { Session } from "@shared-types/interfaces/session.interface";
import type { ISessionRepository } from "@shared-types/interfaces/session.repository.interface";

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
      },
    })) as Session;
  }

  async findById(id: string): Promise<Session | null> {
    return (await prisma.session.findUnique({
      where: {
        id,
      },
    })) as Session | null;
  }

  async findByRefreshToken(refreshTokenHash: string): Promise<Session | null> {
    return (await prisma.session.findUnique({
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

  async revoke(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: {
        id: sessionId,
      },

      data: {
        revoked: true,
      },
    });
  }

  async revokeByToken(refreshTokenHash: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        refreshTokenHash,
      },

      data: {
        revoked: true,
      },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
      },

      data: {
        revoked: true,
      },
    });
  }

  async markRotated(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: {
        id: sessionId,
      },

      data: {
        rotated: true,
      },
    });
  }

  async touch(sessionId: string, date: Date = new Date()): Promise<void> {
    await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        lastUsedAt: date,
      },
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

  async findByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.findByRefreshToken(refreshTokenHash);
  }

  async findAnyByTokenHash(refreshTokenHash: string): Promise<Session | null> {
    return this.findByRefreshToken(refreshTokenHash);
  }

  async revokeUserSessions(userId: string): Promise<void> {
    await this.revokeAll(userId);
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.findActiveSessions(userId);
  }
  async revokeUserSession(userId: string, sessionId: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        revoked: true,
      },
    });
  }
  async revokeAsRotated(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        revoked: true,
        rotated: true,
      },
    });
  }
}
