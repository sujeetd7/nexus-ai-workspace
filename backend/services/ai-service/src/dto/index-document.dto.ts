export interface IndexDocumentDto {
  workspaceId: string;

  provider: string;

  model?: string;

  documentId: string;

  title: string;

  content: string;

  metadata?: Record<string, unknown>;

  type?: "text" | "markdown" | "code";
}
