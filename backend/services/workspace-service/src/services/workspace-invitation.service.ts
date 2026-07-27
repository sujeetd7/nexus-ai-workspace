import { randomUUID } from "crypto";

import { prisma } from "../config/database/prisma";
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

  /**
   * Accept an invitation.
   *
   * Identity (W3):
   * - `userId` MUST come from verified access-token subject (Gateway + Workspace auth).
   * - Body-supplied `userId` is not part of the stable contract.
   * - When `email` is supplied, it MUST match `invitation.email` (case-insensitive).
   *
   * @param token   - The unique invitation token from the email link.
   * @param userId  - Accepting user id from verified access-token subject.
   * @param email   - Optional identity guard against invitation.email.
   */
  async acceptInvitation(token: string, userId: string, email?: string) {
    if (!userId) {
      throw new Error("userId is required to accept an invitation");
    }

    const invitation = await this.repository.findByToken(token);

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation expired");
    }

    if (invitation.status === "ACCEPTED") {
      throw new Error("Invitation already accepted");
    }

    // Strongest identity field available on the invitation model today: email.
    if (email !== undefined && email !== null && String(email).trim() !== "") {
      if (
        String(email).trim().toLowerCase() !==
        String(invitation.email).trim().toLowerCase()
      ) {
        throw new Error(
          "Invitation identity mismatch: email does not match this invitation",
        );
      }
    }

    // Atomically: create WorkspaceMember and mark invitation accepted.
    // If member creation fails (e.g. duplicate @@unique[workspaceId,userId]) the
    // invitation stays PENDING and the transaction is rolled back.
    return prisma.$transaction(async (tx) => {
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });

      return tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    });
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
