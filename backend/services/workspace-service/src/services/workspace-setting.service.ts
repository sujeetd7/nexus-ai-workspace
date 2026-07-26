import { WorkspaceSettingRepository } from "../repositories/workspace-setting.repository";

export class WorkspaceSettingService {
  private repository = new WorkspaceSettingRepository();

  async create(workspaceId: string, data: any) {
    const existing = await this.repository.findByWorkspace(workspaceId);

    if (existing) {
      throw new Error("Settings already exist");
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
