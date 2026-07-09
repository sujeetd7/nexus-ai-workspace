import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

import { ProviderManager } from "../providers/provider-manager";
import { AIExecutionResult } from "../providers/provider.interface";

export class AIOrchestrator {
  private readonly providerManager = new ProviderManager();

  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    const provider = await this.providerManager.getProvider(
      request.provider ?? "ollama",
    );

    return provider.execute(request);
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    const provider = await this.providerManager.getProvider(
      request.provider ?? "ollama",
    );

    yield* provider.stream(request);
  }
}
