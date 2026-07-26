export interface CreateWorkspaceBillingDto {
  workspaceId: string;

  plan: string;

  credits?: number;

  storageUsedGb?: number;
}

export interface UpdateWorkspaceBillingDto {
  plan?: string;

  credits?: number;

  storageUsedGb?: number;
}
