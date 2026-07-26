import { prisma } from "@config/database/prisma";

export class WorkspaceInvitationRepository {
  async create(data: any) {
    return prisma.workspaceInvitation.create({
      data,
    });
  }

  async findByToken(token: string) {
    return prisma.workspaceInvitation.findUnique({
      where: {
        token,
      },
    });
  }

  async findByWorkspace(workspaceId: string) {
    return prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateStatus(id: string, status: any) {
    return prisma.workspaceInvitation.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  async delete(id: string) {
    return prisma.workspaceInvitation.delete({
      where: {
        id,
      },
    });
  }
}
