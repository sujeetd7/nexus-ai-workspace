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

export interface ILLMProvider {
  readonly name: string;

  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse>;
}
