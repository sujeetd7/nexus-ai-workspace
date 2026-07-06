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

  content: string;

  model: string;

  temperature?: number;
}

export interface ExecutePromptDto {
  promptVersionId: string;

  input: any;
}
