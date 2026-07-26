export interface WorkspaceMemberEntity {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: Date;
}
