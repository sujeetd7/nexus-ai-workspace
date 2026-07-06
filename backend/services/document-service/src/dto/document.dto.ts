export interface CreateDocumentDto {
  workspaceId: string;

  uploadedBy: string;

  filename: string;

  mimeType: string;

  size: number;

  storagePath: string;

  metadata?: any;
}

export interface UpdateDocumentDto {
  filename?: string;

  metadata?: any;

  status?: string;
}
