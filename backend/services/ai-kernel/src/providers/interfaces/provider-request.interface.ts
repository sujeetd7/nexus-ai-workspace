export interface ProviderRequest {
  prompt: string;

  model: string;

  temperature: number;

  stream: boolean;

  maxTokens?: number;

  systemPrompt?: string;
}