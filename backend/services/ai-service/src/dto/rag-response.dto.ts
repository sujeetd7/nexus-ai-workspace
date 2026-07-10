import { SearchVectorResultDto } from "./search-vector-result.dto";

export interface RagCitationDto {
  id: string;

  score: number;

  metadata?: Record<string, unknown>;
}

export interface RagResponseDto {
  answer: string;

  provider: string;

  model: string;

  citations: RagCitationDto[];

  documents: SearchVectorResultDto[];
}
