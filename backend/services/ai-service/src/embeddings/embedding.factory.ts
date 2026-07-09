import { EmbeddingProvider } from "./embedding.interface";
import { EmbeddingRegistry } from "./embedding.registry";
import { MockEmbeddingProvider } from "./mock-embedding.provider";

export class EmbeddingFactory {
  static create(provider: string): EmbeddingProvider {
    return EmbeddingRegistry.get(provider) ?? new MockEmbeddingProvider();
  }
}
