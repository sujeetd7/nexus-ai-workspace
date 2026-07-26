export interface RagQueryDto {
  workspaceId: string;

  provider: string;

  model?: string;

  question: string;

  topK?: number;

  metadata?: Record<string, string | number | boolean | null>;
}
