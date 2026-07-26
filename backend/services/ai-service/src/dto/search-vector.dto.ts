export interface SearchVectorDto {
  workspaceId: string;
  collection?: string;
  query: string;
  provider: string;
  model?: string;
  topK?: number;
  limit?: number;
}
