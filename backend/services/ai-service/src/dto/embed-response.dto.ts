export interface EmbedResponseDto {
  provider: string;

  model: string;

  dimensions: number;

  embeddings: number[][];
}
