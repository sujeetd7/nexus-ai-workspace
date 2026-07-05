import { randomUUID } from "crypto";

import { WorkspaceInvitationRepository } from "../repositories/workspace-invitation.repository";

export class WorkspaceInvitationService {
  private repository = new WorkspaceInvitationRepository();

  async createInvitation(data: any) {
    return this.repository.create({
      ...data,
      token: randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  async getInvitations(workspaceId: string) {
    return this.repository.findByWorkspace(workspaceId);
  }

  async acceptInvitation(token: string) {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation expired");
    }

    return this.repository.updateStatus(invitation.id, "ACCEPTED");
  }

  async rejectInvitation(token: string) {
    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    return this.repository.updateStatus(invitation.id, "REJECTED");
  }

  async deleteInvitation(id: string) {
    return this.repository.delete(id);
  }
}
