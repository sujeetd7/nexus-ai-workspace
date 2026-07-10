import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

import { ProviderConfig } from "../config/provider-config";
import { AIOrchestrator } from "../orchestrators/ai-orchestrator";
import { ProviderManager } from "../providers/provider-manager";
import { AIExecutionRepository } from "../repositories/ai-execution.repository";
import { MetricsService } from "./metrics.service";

export class AIService {
  private readonly orchestrator = new AIOrchestrator();

  private readonly repository = new AIExecutionRepository();

  private readonly metrics = new MetricsService();

  private readonly providerManager = new ProviderManager();

  async execute(dto: ExecuteAIDto) {
    if (!dto || !dto.prompt) {
      throw new Error("Validation: prompt is required");
    }

    dto.provider ??= "ollama";
    dto.model ??= ProviderConfig.getDefaultModel(dto.provider);
    dto.workspaceId ??= "system";
    dto.userId ??= "system";

    const result = await this.orchestrator.execute(dto);

    this.metrics.logExecution(
      result.provider,
      result.durationMs,
      result.totalTokens,
    );

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
    };
  }

  async *stream(dto: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    dto.provider ??= "ollama";
    dto.model ??= ProviderConfig.getDefaultModel(dto.provider);

    yield* this.orchestrator.stream(dto);
  }

  async health(provider = "ollama") {
    const aiProvider = await this.providerManager.getProvider(provider);

    return aiProvider.health();
  }
}
