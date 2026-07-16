export interface DocumentSearchRequestDTO {
  query: string;
  topK?: number;
  filters?: Record<string, any>;
  knowledgeBase?: string;
  workspaceId?: string;
}
