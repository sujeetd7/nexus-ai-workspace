export interface ProviderUsage {
  promptTokens: number;

  completionTokens: number;

  totalTokens: number;
}

export interface ProviderResponse {
  text: string;

  usage?: ProviderUsage;

  finishReason?: string;

  raw?: unknown;
}
