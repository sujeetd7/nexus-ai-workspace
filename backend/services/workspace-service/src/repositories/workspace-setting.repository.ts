import { prisma } from "@config/database/prisma";

export class WorkspaceSettingRepository {
  async create(data: any) {
    return prisma.workspaceSetting.create({
      data,
    });
  }

  async findByWorkspace(workspaceId: string) {
    return prisma.workspaceSetting.findUnique({
      where: {
        workspaceId,
      },
    });
  }

  async update(workspaceId: string, data: any) {
    return prisma.workspaceSetting.update({
      where: {
        workspaceId,
      },
      data,
    });
  }
}
