export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  provider: string;
  model: string;
}

export interface EmbeddingProvider {
  readonly provider: string;

  embed(text: string): Promise<EmbeddingResult>;

  health(): Promise<boolean>;
}
