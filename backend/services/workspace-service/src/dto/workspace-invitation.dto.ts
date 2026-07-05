import { WorkspaceRole } from "@generated/prisma";

export interface CreateInvitationDto {
  workspaceId: string;
  email: string;
  invitedBy: string;
  role: WorkspaceRole;
}

export interface AcceptInvitationDto {
  token: string;
}
