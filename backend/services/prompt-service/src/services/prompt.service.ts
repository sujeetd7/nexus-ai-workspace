import { PromptRepository } from "../repositories/prompt.repository";

import { PromptVersionRepository } from "../repositories/prompt-version.repository";

import { PromptExecutionRepository } from "../repositories/prompt-execution.repository";

export class PromptService {
  private promptRepo = new PromptRepository();

  private versionRepo = new PromptVersionRepository();

  private executionRepo = new PromptExecutionRepository();

  async createPrompt(data: any) {
    return this.promptRepo.create(data);
  }

  async createVersion(data: any) {
    return this.versionRepo.create(data);
  }

  async execute(data: any) {
    return this.executionRepo.create({
      promptVersionId: data.promptVersionId,

      input: data.input,

      output: {
        response: "Mock LLM Response",
      },

      tokens: 100,

      latency: 250,
    });
  }

  async list() {
    return this.promptRepo.findAll();
  }

  async get(id: string) {
    return this.promptRepo.findById(id);
  }

  async delete(id: string) {
    return this.promptRepo.delete(id);
  }
}
