import { MockProvider } from "./mock.provider";
import { OllamaProvider } from "./ollama.provider";
import { AIProvider } from "./provider.interface";

export class ProviderFactory {
  static create(provider: string): AIProvider {
    switch (provider.toLowerCase()) {
      case "ollama":
        return new OllamaProvider();

      case "mock":
        return new MockProvider();

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
