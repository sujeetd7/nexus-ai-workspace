export interface CreateAuditDto {
  workspaceId: string;
  actorId: string;
  action: string;
  resource: string;
  metadata?: any;
}
