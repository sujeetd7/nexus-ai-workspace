export interface ExecuteResponse {
  provider: string;

  model: string;

  content: string;

  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  durationMs: number;

  finishReason?: string;
}
