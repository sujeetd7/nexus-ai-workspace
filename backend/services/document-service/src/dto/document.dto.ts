import type { Prisma } from "@prisma/client";

export interface CreateDocumentDto {
  workspaceId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  size: number;
  storagePath: string;
  status?: "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";
  metadata?: Prisma.InputJsonValue;
}

export interface UpdateDocumentDto {
  filename?: string;
  mimeType?: string;
  size?: number;
  storagePath?: string;
  status?: "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";
  metadata?: Prisma.InputJsonValue;
}

export interface ListDocumentsDto {
  workspaceId?: string;
  status?: "PROCESSING" | "READY" | "FAILED" | "ARCHIVED";
  search?: string;
  skip?: number;
  take?: number;
}
