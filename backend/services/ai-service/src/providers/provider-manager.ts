import { ProviderError } from "../errors/provider.error";
import { ProviderFactory } from "./provider.factory";
import { AIProvider } from "./provider.interface";

export class ProviderManager {
  async getProvider(providerName: string): Promise<AIProvider> {
    let provider: AIProvider;

    try {
      provider = ProviderFactory.create(providerName);
    } catch (err) {
      if (err instanceof ProviderError) {
        throw err;
      }
      throw new ProviderError(
        providerName,
        404,
        "provider_not_found",
        `Unknown provider: "${providerName}"`,
      );
    }

    const healthy = await provider.health();

    if (!healthy) {
      throw new ProviderError(
        providerName,
        503,
        "provider_unavailable",
        `${providerName} provider is unavailable`,
      );
    }

    return provider;
  }
}
