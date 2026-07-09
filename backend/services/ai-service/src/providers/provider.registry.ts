import { ClaudeProvider } from "./claude.provider";
import { GeminiProvider } from "./gemini.provider";
import { MockProvider } from "./mock.provider";
import { OllamaProvider } from "./ollama.provider";
import { OpenAIProvider } from "./openai.provider";
import { AIProvider } from "./provider.interface";

export class ProviderRegistry {
  private static readonly providers = new Map([
    ["ollama", new OllamaProvider()],
    ["mock", new MockProvider()],
    ["openai", new OpenAIProvider()],
    ["gemini", new GeminiProvider()],
    ["claude", new ClaudeProvider()],
  ]);

  static get(provider: string): AIProvider | undefined {
    return this.providers.get(provider);
  }

  static register(name: string, provider: AIProvider): void {
    this.providers.set(name, provider);
  }
}
