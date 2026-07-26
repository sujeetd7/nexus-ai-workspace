import { EmbeddingProvider } from "./embedding.interface";
import { OllamaEmbeddingProvider } from "./ollama-embedding.provider";
import { OpenAIEmbeddingProvider } from "./openai-embedding.provider";

export class EmbeddingRegistry {
  private static readonly providers = new Map<string, EmbeddingProvider>([
    ["ollama", new OllamaEmbeddingProvider()],
    ["openai", new OpenAIEmbeddingProvider()],
  ]);

  static get(provider: string) {
    return this.providers.get(provider);
  }
}
