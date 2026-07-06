export interface CreateWorkspacePermissionDto {
  workspaceId: string;
  userId: string;
  permission: string;
}

export interface DeleteWorkspacePermissionDto {
  workspaceId: string;
  userId: string;
  permission: string;
}
