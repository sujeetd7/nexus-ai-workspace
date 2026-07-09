import { EmbeddingProvider, EmbeddingResult } from "./embedding.interface";

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "mock";

  async embed(text: string): Promise<EmbeddingResult> {
    return {
      vector: Array.from({ length: 768 }, () => Math.random()),
      dimensions: 768,
      provider: "mock",
      model: "mock",
    };
  }

  async health() {
    return true;
  }
}
