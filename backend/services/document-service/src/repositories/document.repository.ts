import { prisma } from "@config/database/prisma";

export class DocumentRepository {
  async create(data: any) {
    return prisma.document.create({
      data,
    });
  }

  async findAll() {
    return prisma.document.findMany({
      include: {
        versions: true,
        tags: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.document.findUnique({
      where: {
        id,
      },
      include: {
        versions: true,
        tags: true,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.document.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string) {
    return prisma.document.delete({
      where: {
        id,
      },
    });
  }
}
