import { LLMService, LLMRequest } from "./llm.service";
import { StreamEventDto } from "../dto/stream-event.dto";
import { ChatMessage } from "./completion.service";

export interface StreamRequest {
  prompt?: string;
  messages?: ChatMessage[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  workspaceId?: string;
  userId?: string;
}

export class StreamingService {
  private readonly llmService = new LLMService();

  async *stream(request: StreamRequest): AsyncGenerator<StreamEventDto> {
    const llmRequest: LLMRequest = {
      prompt: request.prompt,
      messages: request.messages,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: true,
      workspaceId: request.workspaceId,
      userId: request.userId,
    };

    yield* this.llmService.stream(llmRequest);
  }

  async *streamCompletion(request: {
    prompt: string;
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
    userId?: string;
  }): AsyncGenerator<StreamEventDto> {
    yield* this.stream({
      prompt: request.prompt,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      workspaceId: request.workspaceId,
      userId: request.userId,
    });
  }

  async *streamChat(request: {
    messages: ChatMessage[];
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
    userId?: string;
  }): AsyncGenerator<StreamEventDto> {
    yield* this.stream({
      messages: request.messages,
      provider: request.provider,
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      workspaceId: request.workspaceId,
      userId: request.userId,
    });
  }
}