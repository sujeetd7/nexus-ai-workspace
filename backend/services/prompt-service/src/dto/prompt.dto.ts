export interface CreatePromptDto {
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
}

export interface CreatePromptVersionDto {
  promptId: string;
  version: number;
  systemPrompt?: string;
  userPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

export interface ExecutePromptDto {
  promptId: string;
  variables: Record<string, unknown>;
}

export interface PublishPromptVersionDto {
  versionId: string;
}

export interface RollbackPromptVersionDto {
  promptId: string;
  version: number;
}
export interface RollbackPromptDto {
  promptId: string;
  version: number;
}

export interface PlaygroundPromptDto {
  versionId: string;
  variables: Record<string, unknown>;
}
