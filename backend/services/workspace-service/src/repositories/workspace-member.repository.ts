import { prisma } from "@config/database/prisma";

export class WorkspaceMemberRepository {
  async create(data: { workspaceId: string; userId: string; role: any }) {
    return prisma.workspaceMember.create({
      data,
    });
  }

  async findMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
    });
  }

  // GET /workspaces/:workspaceId/members/:memberId
  async findMember(workspaceId: string, memberId: string) {
    return prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId,
      },
    });
  }

  // PATCH /workspaces/:workspaceId/members/:memberId
  async updateRole(workspaceId: string, memberId: string, role: any) {
    return prisma.workspaceMember.updateMany({
      where: {
        id: memberId,
        workspaceId,
      },
      data: {
        role,
      },
    });
  }

  // DELETE /workspaces/:workspaceId/members/:memberId
  async delete(workspaceId: string, memberId: string) {
    return prisma.workspaceMember.deleteMany({
      where: {
        id: memberId,
        workspaceId,
      },
    });
  }
}
