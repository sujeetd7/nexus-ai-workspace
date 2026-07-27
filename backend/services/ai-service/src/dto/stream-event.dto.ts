export enum StreamEventType {
  TOKEN = "token",

  TOOL_CALL = "tool_call",

  TOOL_RESULT = "tool_result",

  REASONING = "reasoning",

  CITATION = "citation",

  ERROR = "error",

  DONE = "done",
}

export interface StreamEventDto {
  type: StreamEventType;

  content?: string;

  data?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    finishReason?: string;
    [key: string]: any;
  };
}
