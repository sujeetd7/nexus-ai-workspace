import { EmbedAIDto } from "../dto/embed-ai.dto";

import { ProviderManager } from "../providers/provider-manager";

export class EmbeddingService {
  private readonly providerManager = new ProviderManager();

  // private readonly vectorStore = new ChromaVectorStore();

  async generate(request: EmbedAIDto) {
    const provider = await this.providerManager.getProvider(request.provider);

    return provider.embed(request);
  }

  async generateBatch(
    provider: string,
    model: string | undefined,
    inputs: string[],
  ) {
    const aiProvider = await this.providerManager.getProvider(provider);

    return aiProvider.embed({
      provider,
      model,
      input: inputs,
    });
  }
}
