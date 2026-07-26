import { prisma } from "@config/database/prisma";

interface PromptQueryFilters {
  search?: string;
  category?: string;
  tag?: string;
  favorite?: boolean;
  shared?: boolean;
}

export class PromptRepository {
  async create(data: any) {
    return prisma.prompt.create({
      data,
    });
  }

  async findAll(filters: PromptQueryFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tag) {
      where.tags = {
        has: filters.tag,
      };
    }

    if (filters.favorite !== undefined) {
      where.isFavorite = filters.favorite;
    }

    if (filters.shared !== undefined) {
      where.isPublic = filters.shared;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return prisma.prompt.findMany({
      where,
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
