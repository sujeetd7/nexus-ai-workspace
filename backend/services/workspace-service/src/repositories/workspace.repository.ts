import { prisma } from "@config/database/prisma";

export class WorkspaceRepository {
  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
    slug: string;
  }) {
    return prisma.workspace.create({
      data,
    });
  }

  async findAll() {
    return prisma.workspace.findMany();
  }

  async findById(id: string) {
    return prisma.workspace.findUnique({
      where: {
        id,
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: any;
    },
  ) {
    return prisma.workspace.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.workspace.delete({
      where: { id },
    });
  }
}
