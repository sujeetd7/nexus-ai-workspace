import { WorkspaceMemberRepository } from "../repositories/workspace-member.repository";

export class WorkspaceMemberService {
  private repository = new WorkspaceMemberRepository();

  async addMember(data: { workspaceId: string; userId: string; role: any }) {
    const existing = await this.repository.findByUser(
      data.workspaceId,
      data.userId,
    );

    if (existing) {
      throw new Error("Member already exists");
    }

    return this.repository.create({
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role,
    });
  }

  async listMembers(workspaceId: string) {
    return this.repository.findMembers(workspaceId);
  }

  async updateRole(workspaceId: string, memberId: string, role: any) {
    const updated = await this.repository.updateRole(
      workspaceId,
      memberId,
      role,
    );

    if (!updated) {
      throw new Error("Member not found");
    }

    return updated;
  }

  async removeMember(workspaceId: string, memberId: string) {
    const deleted = await this.repository.delete(workspaceId, memberId);

    if (!deleted) {
      throw new Error("Member not found");
    }

    return deleted;
  }

  async getMember(workspaceId: string, memberId: string) {
    return this.repository.findMember(workspaceId, memberId);
  }
}
