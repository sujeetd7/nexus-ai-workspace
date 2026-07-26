import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export class PromptVersionRepository {
  async create(data: any) {
    return prisma.promptVersion.create({
      data,
    });
  }

  async latest(promptId: string) {
    return prisma.promptVersion.findFirst({
      where: {
        promptId,
      },

      orderBy: {
        version: "desc",
      },
    });
  }

  async published(promptId: string) {
    return prisma.promptVersion.findFirst({
      where: {
        promptId,

        isPublished: true,
      },
    });
  }

  async publish(versionId: string) {
    const version = await prisma.promptVersion.findUnique({
      where: {
        id: versionId,
      },
    });

    if (!version) {
      throw new Error("Version not found");
    }

    await prisma.promptVersion.updateMany({
      where: {
        promptId: version.promptId,
      },

      data: {
        isPublished: false,
      },
    });

    return prisma.promptVersion.update({
      where: {
        id: versionId,
      },

      data: {
        isPublished: true,

        publishedAt: new Date(),
      },
    });
  }

  async findByPromptAndVersion(promptId: string, version: number) {
    return prisma.promptVersion.findFirst({
      where: {
        promptId,
        version,
      },
    });
  }

  async unpublishAll(promptId: string) {
    return prisma.promptVersion.updateMany({
      where: {
        promptId,
      },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });
  }

  async findPublished(promptId: string) {
    return prisma.promptVersion.findFirst({
      where: {
        promptId,
        isPublished: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.promptVersion.findUnique({
      where: {
        id,
      },
    });
  }
}
