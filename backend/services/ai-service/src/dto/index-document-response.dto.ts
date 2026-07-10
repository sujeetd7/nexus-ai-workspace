export interface IndexDocumentResponseDto {
  documentId: string;

  chunks: number;

  indexed: boolean;

  provider: string;

  model: string;
}
