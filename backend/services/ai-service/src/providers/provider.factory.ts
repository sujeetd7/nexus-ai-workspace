import { MockProvider } from "./mock.provider";
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
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    return providerInstance;
  }

  public getAvailableProviders(): string[] {
    return ProviderRegistry.getAvailableProviders();
  }

  // Legacy static method for backward compatibility
  static create(provider: string): AIProvider {
    return ProviderRegistry.get(provider) ?? new MockProvider();
  }
}
