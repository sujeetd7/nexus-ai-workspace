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
  /**
   * Executes a normal (non-streaming) AI request.
   */
  execute(request: ExecuteAIDto): Promise<AIExecutionResult>;

  /**
   * Streams AI events.
   */
  stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto>;

  /**
   * Checks whether the provider is available.
   */
  health(): Promise<boolean>;
}
