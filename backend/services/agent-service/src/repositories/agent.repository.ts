import { Agent, Prisma } from "@generated/prisma";

import { AgentMapper } from "src/mappers/agent.mapper";
import { prisma } from "../config/database/prisma";
import { CreateAgentRequest } from "../dto/requests/create-agent.request";
import { ListAgentsRequest } from "../dto/requests/list-agents.request";
import { UpdateAgentRequest } from "../dto/requests/update-agent.request";

export class AgentRepository {
  async create(data: CreateAgentRequest): Promise<Agent> {
    return prisma.agent.create({
      data: AgentMapper.toCreateInput(data),
    });
  }

  async findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({
      where: {
        id,
      },
    });
  }

  async findBySlug(slug: string): Promise<Agent | null> {
    return prisma.agent.findUnique({
      where: {
        slug,
      },
    });
  }

  async findAll(query: ListAgentsRequest) {
    const { page = 1, limit = 20, workspaceId, status, search } = query;

    const where: Prisma.AgentWhereInput = {};

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [items, total] = await prisma.$transaction([
      prisma.agent.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.agent.count({
        where,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: UpdateAgentRequest): Promise<Agent> {
    return prisma.agent.update({
      where: {
        id,
      },
      data: AgentMapper.toUpdateInput(data),
    });
  }

  async delete(id: string): Promise<Agent> {
    return prisma.agent.delete({
      where: {
        id,
      },
    });
  }
}

export const agentRepository = new AgentRepository();
