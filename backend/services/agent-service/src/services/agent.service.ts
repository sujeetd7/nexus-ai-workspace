import { ConflictError } from "../errors/conflict-error";
import { NotFoundError } from "../errors/not-found-error";

import { CreateAgentRequest } from "../dto/requests/create-agent.request";
import { ListAgentsRequest } from "../dto/requests/list-agents.request";
import { UpdateAgentRequest } from "../dto/requests/update-agent.request";

import { AgentRepository } from "../repositories/agent.repository";

export class AgentService {
  private readonly repository = new AgentRepository();

  async create(data: CreateAgentRequest) {
    const existing = await this.repository.findBySlug(data.slug);

    if (existing) {
      throw new ConflictError(`Agent '${data.slug}' already exists.`);
    }

    return this.repository.create(data);
  }

  async list(query: ListAgentsRequest) {
    return this.repository.findAll(query);
  }

  async get(id: string) {
    const agent = await this.repository.findById(id);

    if (!agent) {
      throw new NotFoundError("Agent not found.");
    }

    return agent;
  }

  async update(id: string, dto: UpdateAgentRequest) {
    await this.get(id);

    return this.repository.update(id, dto);
  }

  async delete(id: string) {
    await this.get(id);

    await this.repository.delete(id);

    return {
      success: true,
      message: "Agent deleted successfully.",
    };
  }
}
