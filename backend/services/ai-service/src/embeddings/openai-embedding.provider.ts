import { EmbeddingProvider, EmbeddingResult } from "./embedding.interface";

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly provider = "openai";

  async embed(text: string): Promise<EmbeddingResult> {
    throw new Error("Not implemented");
  }

  async health(): Promise<boolean> {
    return true;
  }
}
