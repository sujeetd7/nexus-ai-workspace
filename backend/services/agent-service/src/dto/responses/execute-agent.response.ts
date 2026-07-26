export interface ExecuteAgentResponse {
  executionId: string;

  output: unknown;

  provider: string;

  model: string;

  tokens?: number;

  latency?: number;

  createdAt: Date;
}
