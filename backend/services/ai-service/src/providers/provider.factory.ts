import { MockProvider } from "./mock.provider";
import { AIProvider } from "./provider.interface";
import { ProviderRegistry } from "./provider.registry";

export class ProviderFactory {
  static create(provider: string): AIProvider {
    return ProviderRegistry.get(provider) ?? new MockProvider();
  }
}
