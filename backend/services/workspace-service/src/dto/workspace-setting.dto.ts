export interface CreateWorkspaceSettingDto {
  workspaceId: string;

  allowGuests?: boolean;
  allowPublicPrompts?: boolean;
  maxMembers?: number;
  storageQuotaGb?: number;
}

export interface UpdateWorkspaceSettingDto {
  allowGuests?: boolean;
  allowPublicPrompts?: boolean;
  maxMembers?: number;
  storageQuotaGb?: number;
}
