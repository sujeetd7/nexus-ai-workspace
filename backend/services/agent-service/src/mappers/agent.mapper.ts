import { Agent, Prisma } from "@generated/prisma";

import { CreateAgentRequest } from "../dto/requests/create-agent.request";
import { UpdateAgentRequest } from "../dto/requests/update-agent.request";
import { AgentResponse } from "../dto/responses/agent.response";

export class AgentMapper {
  static toCreateInput(dto: CreateAgentRequest): Prisma.AgentCreateInput {
    return {
      workspaceId: dto.workspaceId,
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      systemPrompt: dto.systemPrompt,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    };
  }

  static toUpdateInput(dto: UpdateAgentRequest): Prisma.AgentUpdateInput {
    return {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      systemPrompt: dto.systemPrompt,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      status: dto.status,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    };
  }

  static toResponse(agent: Agent): AgentResponse {
    return {
      id: agent.id,
      workspaceId: agent.workspaceId,
      name: agent.name,
      slug: agent.slug,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      provider: agent.provider,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      status: agent.status,
      metadata: agent.metadata as Record<string, unknown> | null,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
}
