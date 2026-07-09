import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto } from "../dto/stream-event.dto";

export interface AIExecutionResult {
  text: string;

  promptTokens: number;

  completionTokens: number;

  totalTokens: number;

  durationMs: number;

  provider: string;

  model: string;
}

export interface AIProvider {
  execute(request: ExecuteAIDto): Promise<AIExecutionResult>;

  stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto>;

  health(): Promise<boolean>;
}
