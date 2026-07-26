export interface DocumentEntity {
  id: string;

  workspaceId: string;

  uploadedBy: string;

  filename: string;

  mimeType: string;

  size: number;

  storagePath: string;

  status: string;

  metadata?: any;

  createdAt: Date;

  updatedAt: Date;
}
