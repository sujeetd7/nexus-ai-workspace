import { prisma } from "@config/database/prisma";

export class DocumentTagRepository {
  async create(data: any) {
    return prisma.documentTag.create({
      data,
    });
  }

  async findByDocument(documentId: string) {
    return prisma.documentTag.findMany({
      where: {
        documentId,
      },
    });
  }

  async delete(id: string) {
    return prisma.documentTag.delete({
      where: {
        id,
      },
    });
  }
}
