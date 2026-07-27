import { AIProvider } from "./provider.interface";
import { ProviderRegistry } from "./provider.registry";

export class UnsupportedProviderException extends Error {
  constructor(providerName: string) {
    super(`Unsupported provider: ${providerName}`);
    this.name = "UnsupportedProviderException";
  }
}

export class ProviderRouter {
  private readonly providers: Map<string, AIProvider>;

  constructor() {
    this.providers = ProviderRegistry.getAllProviders();
  }

  public getProvider(providerName: string): AIProvider {
    const provider = this.providers.get(providerName.toLowerCase());

    if (!provider) {
      throw new UnsupportedProviderException(providerName);
    }

    return provider;
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  public hasProvider(providerName: string): boolean {
    return this.providers.has(providerName.toLowerCase());
  }

  public async getHealthyProviders(): Promise<string[]> {
    const healthyProviders: string[] = [];
    const providerEntries = Array.from(this.providers.entries());

    for (const [name, provider] of providerEntries) {
      try {
        const health = await provider.health();
        if (health) {
          healthyProviders.push(name);
        }
      } catch (error) {
        console.warn(`Health check failed for ${name}:`, error);
      }
    }

    return healthyProviders;
  }
}
