export interface WorkspaceBillingEntity {
  id: string;

  workspaceId: string;

  plan: string;

  credits: number;

  storageUsedGb: number;
}
