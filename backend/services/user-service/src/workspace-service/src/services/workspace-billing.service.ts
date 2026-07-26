import { WorkspaceBillingRepository } from "../repositories/workspace-billing.repository";

export class WorkspaceBillingService {
  private repository = new WorkspaceBillingRepository();

  async create(workspaceId: string, data: any) {
    const existing = await this.repository.findByWorkspace(workspaceId);

    if (existing) {
      throw new Error("Billing already exists");
    }

    return this.repository.create({
      workspaceId,
      ...data,
    });
  }

  async get(workspaceId: string) {
    return this.repository.findByWorkspace(workspaceId);
  }

  async update(workspaceId: string, data: any) {
    return this.repository.update(workspaceId, data);
  }
}
