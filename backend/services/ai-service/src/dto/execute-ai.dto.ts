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

export interface ExecuteAIDto {
  workspaceId: string;
  userId: string;
  provider?: string;
  model?: string;
  prompt: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}
