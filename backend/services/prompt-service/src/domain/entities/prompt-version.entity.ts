export interface PromptVersionEntity {
  id: string;

  promptId: string;

  version: number;

  content: string;

  model: string;

  temperature: number;

  createdAt: Date;
}
