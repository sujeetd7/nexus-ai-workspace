export interface ExecuteRequest {
  provider?: string;

  model?: string;

  systemPrompt?: string;

  prompt: string;

  temperature?: number;

  maxTokens?: number;

  stream?: boolean;

  metadata?: Record<string, unknown>;
}
