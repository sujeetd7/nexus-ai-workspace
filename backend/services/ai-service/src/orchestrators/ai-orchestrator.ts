import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";
import { ProviderManager } from "../providers/provider-manager";

export class AIOrchestrator {
  private providerManager = new ProviderManager();

  async execute(request: ExecuteAIDto) {
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
