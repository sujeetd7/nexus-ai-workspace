export interface DeleteDocumentDto {
  workspaceId: string;

  provider: string;

  model?: string;

  documentId: string;
}
