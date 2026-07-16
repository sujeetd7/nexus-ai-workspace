export interface DocumentDTO {
  id: string;
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}
