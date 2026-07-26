import { prisma } from "@config/database/prisma";

export class DocumentVersionRepository {
  async create(data: any) {
    return prisma.documentVersion.create({
      data,
    });
  }

  async findByDocument(documentId: string) {
    return prisma.documentVersion.findMany({
      where: {
        documentId,
      },
    });
  }
}
