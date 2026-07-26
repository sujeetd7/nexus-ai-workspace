import { prisma } from "@config/database/prisma";

export class WorkspaceBillingRepository {
  async create(data: any) {
    return prisma.workspaceBilling.create({
      data,
    });
  }

  async findByWorkspace(workspaceId: string) {
    return prisma.workspaceBilling.findUnique({
      where: {
        workspaceId,
      },
    });
  }

  async update(workspaceId: string, data: any) {
    return prisma.workspaceBilling.update({
      where: {
        workspaceId,
      },
      data,
    });
  }
}
