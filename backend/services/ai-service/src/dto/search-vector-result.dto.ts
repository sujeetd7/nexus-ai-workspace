export interface SearchVectorResultDto {
  id: string;
  document: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchVectorResponseDto {
  provider: string;

  model: string;

  results: SearchVectorResultDto[];
}
