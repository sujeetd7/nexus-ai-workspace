export interface WorkspaceAuditEntity {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string;
  resource: string;
  metadata?: any;
  createdAt: Date;
}
