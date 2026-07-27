import { LLMService, LLMRequest, LLMResponse } from "./llm.service";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  prompt: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  workspaceId?: string;
  userId?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  workspaceId?: string;
  userId?: string;
}

export class CompletionService {
  private readonly llmService = new LLMService();

  async generate(request: CompletionRequest): Promise<LLMResponse> {
    const llmRequest: LLMRequest = {
      prompt: request.prompt,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      workspaceId: request.workspaceId,
      userId: request.userId,
    };

    return this.llmService.generate(llmRequest);
  }

  async chat(request: ChatRequest): Promise<LLMResponse> {
    const llmRequest: LLMRequest = {
      messages: request.messages,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      workspaceId: request.workspaceId,
      userId: request.userId,
    };

    return this.llmService.generate(llmRequest);
  }
}
