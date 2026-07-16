import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";
import { ExecuteAIDto, ToolCall } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

export interface AIExecutionResult {
  text: string;

  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  durationMs: number;

  provider: string;

  model: string;

  toolCalls?: ToolCall[];

  finishReason?: string;
}
export interface AIProvider {
  execute(request: ExecuteAIDto): Promise<AIExecutionResult>;

  stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto>;

  embed(request: EmbedAIDto): Promise<EmbedResponseDto>;

  health(): Promise<boolean>;
}
