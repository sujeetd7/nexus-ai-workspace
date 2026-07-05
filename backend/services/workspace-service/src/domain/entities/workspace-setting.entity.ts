export interface WorkspaceSettingEntity {
  id: string;
  workspaceId: string;

  allowGuests: boolean;
  allowPublicPrompts: boolean;
  maxMembers: number;
  storageQuotaGb: number;
}
