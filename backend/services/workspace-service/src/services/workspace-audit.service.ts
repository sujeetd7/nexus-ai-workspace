import { WorkspaceAuditRepository } from "../repositories/workspace-audit.repository";

export class WorkspaceAuditService {
  private repository = new WorkspaceAuditRepository();

  async create(workspaceId: string, data: any) {
    return this.repository.create({
      workspaceId,
      ...data,
    });
  }

  async list(workspaceId: string) {
    return this.repository.findByWorkspace(workspaceId);
  }
}
