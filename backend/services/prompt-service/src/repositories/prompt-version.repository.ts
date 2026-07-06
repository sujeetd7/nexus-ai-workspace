import { prisma } from "@config/database/prisma";

export class PromptVersionRepository {
  async create(data: any) {
    return prisma.promptVersion.create({
      data,
    });
  }

  async findByPrompt(promptId: string) {
    return prisma.promptVersion.findMany({
      where: {
        promptId,
      },
    });
  }
}
