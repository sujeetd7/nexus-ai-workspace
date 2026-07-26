export interface PromptExecutionEntity {
  id: string;

  promptVersionId: string;

  input: any;

  output?: any;

  tokens?: number;

  latency?: number;

  createdAt: Date;
}
