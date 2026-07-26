import { prisma } from "@config/database/prisma";

export class WorkspacePermissionRepository {
  async create(data: {
    workspaceId: string;
    userId: string;
    permission: string;
  }) {
    return prisma.workspacePermission.create({
      data,
    });
  }

  async findPermissions(workspaceId: string, userId: string) {
    return prisma.workspacePermission.findMany({
      where: {
        workspaceId,
        userId,
      },
    });
  }

  async findPermission(
    workspaceId: string,
    userId: string,
    permission: string,
  ) {
    return prisma.workspacePermission.findUnique({
      where: {
        workspaceId_userId_permission: {
          workspaceId,
          userId,
          permission,
        },
      },
    });
  }

  async delete(workspaceId: string, userId: string, permission: string) {
    return prisma.workspacePermission.delete({
      where: {
        workspaceId_userId_permission: {
          workspaceId,
          userId,
          permission,
        },
      },
    });
  }
}
