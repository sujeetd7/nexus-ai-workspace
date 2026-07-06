import { WorkspacePermissionRepository } from "../repositories/workspace-permission.repository";

export class WorkspacePermissionService {
  private repository = new WorkspacePermissionRepository();

  async grantPermission(
    workspaceId: string,
    userId: string,
    permission: string,
  ) {
    const existing = await this.repository.findPermission(
      workspaceId,
      userId,
      permission,
    );

    if (existing) {
      throw new Error("Permission already exists");
    }

    return this.repository.create({
      workspaceId,
      userId,
      permission,
    });
  }

  async getPermissions(workspaceId: string, userId: string) {
    return this.repository.findPermissions(workspaceId, userId);
  }

  async revokePermission(
    workspaceId: string,
    userId: string,
    permission: string,
  ) {
    return this.repository.delete(workspaceId, userId, permission);
  }
}
