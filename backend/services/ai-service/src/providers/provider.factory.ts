import { ProviderError } from "../errors/provider.error";
import { AIProvider } from "./provider.interface";
import { ProviderRegistry } from "./provider.registry";

export class ProviderFactory {
  private static instance: ProviderFactory;

  public static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  public create(provider: string): AIProvider {
    const providerInstance = ProviderRegistry.get(provider);

    if (!providerInstance) {
      throw new ProviderError(
        provider,
        404,
        "provider_not_found",
        `Unknown provider: "${provider}". Available providers: ${ProviderRegistry.getAvailableProviders().join(", ")}`,
      );
    }

    return providerInstance;
  }

  public getAvailableProviders(): string[] {
    return ProviderRegistry.getAvailableProviders();
  }

  // Static convenience — identical behaviour to instance create().
  // Unknown providers throw ProviderError; MockProvider is only reachable via the explicit
  // "mock" registry key.
  static create(provider: string): AIProvider {
    return ProviderFactory.getInstance().create(provider);
  }
}
