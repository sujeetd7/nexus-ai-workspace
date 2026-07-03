import { WorkspaceMemberRepository } from "../repositories/workspace-member.repository";

export class WorkspaceMemberService {
  private repository = new WorkspaceMemberRepository();

  async addMember(data: { workspaceId: string; memberId: string; role: any }) {
    const existing = await this.repository.findMember(
      data.workspaceId,
      data.memberId,
    );

    if (existing) {
      throw new Error("Member already exists");
    }

    return this.repository.create(data);
  }

  async listMembers(workspaceId: string) {
    return this.repository.findMembers(workspaceId);
  }

  async updateRole(workspaceId: string, memberId: string, role: any) {
    return this.repository.updateRole(workspaceId, memberId, role);
  }

  async removeMember(workspaceId: string, memberId: string) {
    return this.repository.delete(workspaceId, memberId);
  }

  async getMember(workspaceId: string, memberId: string) {
    return this.repository.findMember(workspaceId, memberId);
  }
}
