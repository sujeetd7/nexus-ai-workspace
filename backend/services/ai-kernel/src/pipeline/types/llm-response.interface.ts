export interface LLMUsage {
  promptTokens: number;

  completionTokens: number;

  totalTokens: number;
}

export interface LLMResponse {
  provider: string;

  model: string;

  text: string;

  finishReason?: string;

  usage?: LLMUsage;

  raw?: unknown;
}
