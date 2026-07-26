export interface WorkspacePermissionEntity {
  id: string;
  workspaceId: string;
  userId: string;
  permission: string;
  createdAt: Date;
}
