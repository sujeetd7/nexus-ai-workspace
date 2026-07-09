import { EmbedAIDto } from "../dto/embed-ai.dto";

import { ProviderManager } from "../providers/provider-manager";

export class EmbeddingService {
  private readonly providerManager = new ProviderManager();

  async generate(request: EmbedAIDto) {
    const provider = await this.providerManager.getProvider(request.provider);

    return provider.embed(request);
  }
}
