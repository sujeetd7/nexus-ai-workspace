import { EmbeddingProvider, EmbeddingResult } from "./embedding.interface";

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "ollama";

  async embed(text: string): Promise<EmbeddingResult> {
    throw new Error("Not implemented");
  }

  async health(): Promise<boolean> {
    return true;
  }
}
