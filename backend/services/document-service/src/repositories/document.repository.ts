import { prisma } from "@config/database/prisma";
import {
  CreateDocumentDto,
  ListDocumentsDto,
  UpdateDocumentDto,
} from "../dto/document.dto";

export class DocumentRepository {
  async create(data: CreateDocumentDto) {
    return prisma.document.create({
      data,
    });
  }

  async findAll(filter: ListDocumentsDto = {}) {
    const where: Record<string, unknown> = {};

    if (filter.workspaceId) {
      where.workspaceId = filter.workspaceId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.search) {
      where.OR = [
        { filename: { contains: filter.search, mode: "insensitive" } },
        { mimeType: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    return prisma.document.findMany({
      where,
      include: {
        versions: true,
        tags: true,
      },
      skip: filter.skip ?? 0,
      take: filter.take ?? 50,
      orderBy: { createdAt: "desc" },
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

  async update(id: string, data: UpdateDocumentDto) {
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
