export interface IndexBatchDto {
  workspaceId: string;

  provider: string;

  model?: string;

  documentId: string;

  title: string;

  chunks: string[];

  metadata?: Record<string, unknown>;
}
