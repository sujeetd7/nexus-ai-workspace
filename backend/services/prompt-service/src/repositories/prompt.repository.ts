import { prisma } from "@config/database/prisma";

export class PromptRepository {
  async create(data: any) {
    return prisma.prompt.create({
      data,
    });
  }

  async findAll() {
    return prisma.prompt.findMany({
      include: {
        versions: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.prompt.findUnique({
      where: {
        id,
      },
      include: {
        versions: true,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.prompt.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string) {
    return prisma.prompt.delete({
      where: {
        id,
      },
    });
  }
}
