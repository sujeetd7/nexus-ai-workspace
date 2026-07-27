import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  HealthStatus,
  StreamChunk,
} from "../../providers/provider.interface";

export interface IAIServiceClient {
  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
  generate(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
  stream(request: ProviderExecuteRequest): AsyncIterable<StreamChunk>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  health(): Promise<HealthStatus>;
  providerHealth(provider: string): Promise<HealthStatus>;
  getAvailableProviders(): Promise<string[]>;

  // Legacy methods for backward compatibility
  streamExecute(
    request: ProviderExecuteRequest,
  ): AsyncIterable<ProviderExecuteResponse>;
  embed(payload: {
    input: string[];
    model?: string;
  }): Promise<{ embeddings: number[][] }>;
}

export interface AIServiceClientOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
}
