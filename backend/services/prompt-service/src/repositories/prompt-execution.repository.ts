import { prisma } from "@config/database/prisma";

export class PromptExecutionRepository {
  async create(data: any) {
    return prisma.promptExecution.create({
      data,
    });
  }

  async findAll() {
    return prisma.promptExecution.findMany();
  }
}
