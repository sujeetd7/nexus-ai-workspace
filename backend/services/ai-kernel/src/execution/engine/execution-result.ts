import { IToolCall } from "src/planner/planner-module.interface";

/**
 * Represents the standardized result of an execution step within the AI Kernel.
 */
export class ExecutionResult {
  public readonly success: boolean;
  public readonly output: string | object | null;
  public readonly error: Error | null;
  public readonly tokens: number;
  public readonly cost: number;
  public readonly latencyMs: number;
  public readonly toolCalls: IToolCall[];
  public readonly providerMetadata: Record<string, any>; // Metadata from the LLM provider
  public readonly finishReason: string; // e.g., "stop", "length", "tool_calls"
  public readonly executionId: string; // The requestId from the ExecutionContext

  constructor(builder: ExecutionResultBuilder) {
    this.success = builder.success;
    this.output = builder.output;
    this.error = builder.error;
    this.tokens = builder.tokens;
    this.cost = builder.cost;
    this.latencyMs = builder.latencyMs;
    this.toolCalls = builder.toolCalls;
    this.providerMetadata = builder.providerMetadata;
    this.finishReason = builder.finishReason;
    this.executionId = builder.executionId;
  }

  /**
   * Creates a new `ExecutionResultBuilder` instance.
   * @param executionId The unique identifier for the execution.
   * @returns A new `ExecutionResultBuilder`.
   */
  public static builder(executionId: string): ExecutionResultBuilder {
    return new ExecutionResultBuilder(executionId);
  }
}

/**
 * Builder class for constructing `ExecutionResult` instances.
 */
export class ExecutionResultBuilder {
  public success: boolean = false;
  public output: string | object | null = null;
  public error: Error | null = null;
  public tokens: number = 0;
  public cost: number = 0;
  public latencyMs: number = 0;
  public toolCalls: IToolCall[] = [];
  public providerMetadata: Record<string, any> = {};
  public finishReason: string = "unknown";
  public executionId: string;

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  public setSuccess(success: boolean): this {
    this.success = success;
    return this;
  }

  public setOutput(output: string | object | null): this {
    this.output = output;
    return this;
  }

  public setError(error: Error | null): this {
    this.error = error;
    return this;
  }

  public setTokens(tokens: number): this {
    this.tokens = tokens;
    return this;
  }

  public setCost(cost: number): this {
    this.cost = cost;
    return this;
  }

  public setLatencyMs(latencyMs: number): this {
    this.latencyMs = latencyMs;
    return this;
  }

  public setToolCalls(toolCalls: IToolCall[]): this {
    this.toolCalls = toolCalls;
    return this;
  }

  public setProviderMetadata(metadata: Record<string, any>): this {
    this.providerMetadata = metadata;
    return this;
  }

  public setFinishReason(reason: string): this {
    this.finishReason = reason;
    return this;
  }

  public build(): ExecutionResult {
    return new ExecutionResult(this);
  }
}
