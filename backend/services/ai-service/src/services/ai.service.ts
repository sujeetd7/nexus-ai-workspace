import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

import { CompletionService } from "../llm/completion.service";
import { StreamingService } from "../llm/streaming.service";
import { LLMService } from "../llm/llm.service";
import { ProviderHealthService } from "../health/provider-health.service";
import { AIExecutionRepository } from "../repositories/ai-execution.repository";
import { MetricsService } from "./metrics.service";

export class AIService {
  private readonly completionService = new CompletionService();
  private readonly streamingService = new StreamingService();
  private readonly llmService = new LLMService();
  private readonly healthService = new ProviderHealthService();
  private readonly repository = new AIExecutionRepository();
  private readonly metrics = new MetricsService();

  async execute(dto: ExecuteAIDto) {
    if (!dto || !dto.prompt) {
      throw new Error("Validation: prompt is required");
    }

    dto.workspaceId ??= "system";
    dto.userId ??= "system";

    const result = await this.completionService.generate({
      prompt: dto.prompt,
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      workspaceId: dto.workspaceId,
      userId: dto.userId,
    });

    // Log metrics using existing service
    this.metrics.logExecution(
      result.provider,
      result.durationMs,
      result.totalTokens,
    );

    // Store execution record
    try {
      await this.repository.create({
        workspaceId: dto.workspaceId,
        userId: dto.userId,
        provider: result.provider,
        model: result.model,
        prompt: dto.prompt,
        response: result.text,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        durationMs: result.durationMs,
        status: "SUCCESS",
      });
    } catch (err) {
      // Log and continue — still return provider result to callers
      // eslint-disable-next-line no-console
      console.error("AIExecutionRepository.create failed:", err);
    }

    return {
      text: result.text,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      durationMs: result.durationMs,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    };
  }

  async *stream(dto: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    dto.workspaceId ??= "system";
    dto.userId ??= "system";

    yield* this.streamingService.streamCompletion({
      prompt: dto.prompt || "",
      provider: dto.provider,
      model: dto.model,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      workspaceId: dto.workspaceId,
      userId: dto.userId,
    });
  }

  async chat(messages: Array<{role: "system" | "user" | "assistant"; content: string}>, options?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
    userId?: string;
  }) {
    return this.completionService.chat({
      messages,
      provider: options?.provider,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      workspaceId: options?.workspaceId,
      userId: options?.userId,
    });
  }

  async *streamChat(messages: Array<{role: "system" | "user" | "assistant"; content: string}>, options?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    workspaceId?: string;
    userId?: string;
  }): AsyncGenerator<StreamEventDto> {
    yield* this.streamingService.streamChat({
      messages,
      provider: options?.provider,
      model: options?.model,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      workspaceId: options?.workspaceId,
      userId: options?.userId,
    });
  }

  async embeddings(input: string | string[], options?: {
    provider?: string;
    model?: string;
    workspaceId?: string;
    userId?: string;
  }) {
    return this.llmService.embeddings({
      input,
      provider: options?.provider,
      model: options?.model,
      workspaceId: options?.workspaceId,
      userId: options?.userId,
    });
  }

  async health(provider?: string) {
    return this.healthService.health(provider);
  }

  async getHealthyProviders() {
    return this.healthService.getHealthyProviders();
  }
}
