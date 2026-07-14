import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "../../providers/provider.interface";

export interface IAIServiceClient {
  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
  // streamExecute returns an async iterator of partial responses (SSE events)
  streamExecute(
    request: ProviderExecuteRequest,
  ): AsyncIterable<ProviderExecuteResponse>;
  // embed returns embedding vectors for given input
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
