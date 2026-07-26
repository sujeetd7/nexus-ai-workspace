import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export class PromptExecutionRepository {
  async create(data: {
    promptVersionId: string;
    input: any;
    output: any;
    tokens?: number;
    latency?: number;
  }) {
    return prisma.promptExecution.create({
      data: {
        promptVersionId: data.promptVersionId,
        input: data.input as any,
        output: data.output as any,
        tokens: data.tokens,
        latency: data.latency,
      },
    });
  }
  async findAll() {
    return prisma.promptExecution.findMany({
      include: {
        promptVersion: {
          include: {
            prompt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByPrompt(promptId: string) {
    return prisma.promptExecution.findMany({
      where: {
        promptVersion: {
          promptId,
        },
      },
      include: {
        promptVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.promptExecution.findUnique({
      where: { id },
      include: {
        promptVersion: {
          include: {
            prompt: true,
          },
        },
      },
    });
  }
}
