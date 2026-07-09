import { ProviderManager } from "src/providers/provider-manager";
import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

import { AIOrchestrator } from "../orchestrators/ai-orchestrator";
import { AIExecutionRepository } from "../repositories/ai-execution.repository";
import { MetricsService } from "./metrics.service";

export class AIService {
  private readonly orchestrator = new AIOrchestrator();

  private readonly repository = new AIExecutionRepository();

  private readonly metrics = new MetricsService();
  private readonly providerManager = new ProviderManager();

  async execute(dto: ExecuteAIDto) {
    dto.provider ??= "ollama";

    dto.model ??= process.env.DEFAULT_MODEL ?? "qwen2.5-coder:1.5b";

    const result = await this.orchestrator.execute(dto);

    this.metrics.logExecution(
      result.provider,
      result.durationMs,
      result.totalTokens,
    );

    return this.repository.create({
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
  }

  async *stream(dto: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    dto.provider ??= "ollama";

    dto.model ??= process.env.DEFAULT_MODEL ?? "qwen2.5-coder:1.5b";

    yield* this.orchestrator.stream(dto);
  }

  async health(provider: string) {
    const aiProvider = await this.providerManager.getProvider(provider);

    return aiProvider.health();
  }
}
