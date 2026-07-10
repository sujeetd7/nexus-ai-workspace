import { AgentPrompt } from "../prompt-templates/agent.prompt";
import { RagPrompt } from "../prompt-templates/rag.prompt";
import { SummaryPrompt } from "../prompt-templates/summary.prompt";
import { SystemPrompt } from "../prompt-templates/system.prompt";
import { PromptTemplate } from "./prompt.interface";

export class PromptRepository {
  private readonly prompts = new Map<string, PromptTemplate>();

  constructor() {
    [RagPrompt, SystemPrompt, SummaryPrompt, AgentPrompt].forEach((prompt) => {
      this.prompts.set(prompt.name, prompt);
    });
  }

  get(name: string): PromptTemplate {
    const prompt = this.prompts.get(name);

    if (!prompt) {
      throw new Error(`Prompt '${name}' not found.`);
    }

    return prompt;
  }

  getAll(): PromptTemplate[] {
    return [...this.prompts.values()];
  }
}
