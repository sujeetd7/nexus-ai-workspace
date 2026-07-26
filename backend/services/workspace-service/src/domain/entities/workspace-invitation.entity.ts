export interface WorkspaceInvitationEntity {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  token: string;
  invitedBy: string;
  accepted: boolean;
  expiresAt: Date;
  createdAt: Date;
}
