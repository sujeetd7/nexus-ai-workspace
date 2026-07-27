export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";

  content: string;

  tool_call_id?: string;

  name?: string;
}

export interface ToolDefinition {
  type: "function";

  function: {
    name: string;

    description: string;

    parameters: object;
  };
}

export interface ToolCall {
  id: string;

  type: "function";

  function: {
    name: string;

    arguments: string;
  };
}

export interface ProviderExecuteRequest {
  provider: string;

  model: string;

  prompt?: string;

  messages?: ChatMessage[];

  tools?: ToolDefinition[];

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

  toolCalls?: ToolCall[];

  raw?: unknown;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  id: string;
  name: string;
  contextLength?: number;
  type: "chat" | "embedding" | "completion";
}

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  latency?: number;
  error?: string;
}

export interface StreamChunk {
  text: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  readonly name: string;

  generate(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;

  stream(request: ProviderExecuteRequest): AsyncIterable<StreamChunk>;

  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  health(): Promise<HealthStatus>;

  models(): Promise<ModelInfo[]>;

  // Legacy method for backward compatibility
  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
