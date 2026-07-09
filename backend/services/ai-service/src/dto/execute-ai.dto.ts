export interface ExecuteAIDto {
  workspaceId: string;
  userId: string;
  provider?: string;
  model?: string;
  prompt: string;
}
