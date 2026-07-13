export interface ProviderExecuteRequest {
  prompt: string;

  provider: string;

  model: string;

  temperature: number;

  stream: boolean;

  maxTokens: number;
}

export interface ProviderExecuteResponse {
  text: string;

  finishReason?: string;

  usage?: {
    promptTokens: number;

    completionTokens: number;

    totalTokens: number;
  };

  raw?: unknown;
}

export interface ILLMProvider {
  readonly name: string;

  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
