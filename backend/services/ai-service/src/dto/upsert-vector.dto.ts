export interface UpsertVectorDto {
  workspaceId: string;
  provider: string;
  model?: string;

  id: string;

  text: string;

  metadata?: Record<string, string | number | boolean | null>;
}
