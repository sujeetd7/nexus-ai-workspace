export interface DocumentVersionEntity {
  id: string;

  documentId: string;

  version: number;

  storagePath: string;

  createdAt: Date;
}
