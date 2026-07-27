import { prisma } from "@config/database/prisma";

export class WorkspaceMemberRepository {
  async create(data: { workspaceId: string; userId: string; role: any }) {
    return prisma.workspaceMember.create({ data });
  }

  async findMembers(workspaceId: string) {
    return prisma.workspaceMember.findMany({ where: { workspaceId } });
  }

  // GET /workspaces/:workspaceId/members/:memberId
  async findMember(workspaceId: string, memberId: string) {
    return prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
  }

  async findByUser(workspaceId: string, userId: string) {
    return prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
  }

  // PATCH /workspaces/:workspaceId/members/:memberId
  async updateRole(workspaceId: string, memberId: string, role: any) {
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) return null;

    return prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  // DELETE /workspaces/:workspaceId/members/:memberId
  async delete(workspaceId: string, memberId: string) {
    const member = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });

    if (!member) return null;

    return prisma.workspaceMember.delete({ where: { id: memberId } });
  }
}
