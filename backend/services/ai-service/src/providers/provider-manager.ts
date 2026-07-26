import { ProviderError } from "../errors/provider.error";
import { ProviderFactory } from "./provider.factory";
import { AIProvider } from "./provider.interface";

export class ProviderManager {
  async getProvider(providerName: string): Promise<AIProvider> {
    const provider = ProviderFactory.create(providerName);

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
