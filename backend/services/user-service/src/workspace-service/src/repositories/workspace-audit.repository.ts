import { prisma } from "@config/database/prisma";

export class WorkspaceAuditRepository {
  async create(data: any) {
    return prisma.workspaceAuditLog.create({
      data,
    });
  }

  async findByWorkspace(workspaceId: string) {
    return prisma.workspaceAuditLog.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
