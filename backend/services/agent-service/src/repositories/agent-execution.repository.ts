import { AgentExecution } from "@generated/prisma";

import { prisma } from "../config/database/prisma";

export class AgentRuntimeRepository {
  async create(data: {
    agentId: string;
    provider: string;
    model: string;
    input: unknown;
    output: unknown;
    latency?: number;
    tokens?: number;
    status?: string;
    error?: string | null;
  }): Promise<AgentExecution> {
    try {
      console.log("[RUNTIME_REPOSITORY] Creating execution with data:", JSON.stringify(data, null, 2));
      
      const prismaData = {
        ...data,
        input: data.input as any,
        output: data.output as any,
      };
      
      console.log("[RUNTIME_REPOSITORY] Prisma data structure:", JSON.stringify(prismaData, null, 2));
      
      const result = await prisma.agentExecution.create({
        data: prismaData,
      });
      
      console.log("[RUNTIME_REPOSITORY] Created execution:", JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error("[RUNTIME_REPOSITORY] ERROR creating execution:", error);
      console.error("[RUNTIME_REPOSITORY] Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  findById(id: string) {
    return prisma.agentExecution.findUnique({
      where: { id },
      include: {
        agent: true,
      },
    });
  }

  findByAgent(agentId: string) {
    return prisma.agentExecution.findMany({
      where: {
        agentId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  findAll() {
    return prisma.agentExecution.findMany({
      include: {
        agent: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
