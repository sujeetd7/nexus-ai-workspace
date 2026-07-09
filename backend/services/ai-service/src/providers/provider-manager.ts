import { ProviderFactory } from "./provider.factory";
import { AIProvider } from "./provider.interface";

export class ProviderManager {
  async getProvider(providerName: string): Promise<AIProvider> {
    const provider = ProviderFactory.create(providerName);

    const healthy = await provider.health();

    if (!healthy) {
      throw new Error(`${providerName} provider is unavailable`);
    }

    return provider;
  }
}
