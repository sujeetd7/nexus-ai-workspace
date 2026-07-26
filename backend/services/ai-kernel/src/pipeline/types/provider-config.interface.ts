export interface ProviderConfig {
  provider: string;

  model: string;

  temperature: number;

  stream: boolean;

  maxTokens: number;
}
