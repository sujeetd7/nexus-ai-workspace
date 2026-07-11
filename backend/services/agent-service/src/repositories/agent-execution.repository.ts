import { AgentExecution } from "@generated/prisma";

import { prisma } from "../config/database/prisma";

export class AgentRuntimeRepository {
  create(data: {
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
    return prisma.agentExecution.create({
      data: {
        ...data,
        input: data.input as any,
        output: data.output as any,
      },
    });
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
