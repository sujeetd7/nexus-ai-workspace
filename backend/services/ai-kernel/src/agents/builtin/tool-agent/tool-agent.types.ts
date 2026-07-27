import { ITool } from "../../../tools/interfaces/tool.interface";

export enum ToolOperation {
  DISCOVER = "discover",
  FIND = "find",
  LIST = "list",
  EXECUTE = "execute",
  EXECUTE_BATCH = "execute_batch",
  VALIDATE = "validate",
}

export enum BatchExecutionMode {
  PARALLEL = "parallel",
  SEQUENTIAL = "sequential",
}

export interface ToolOperationRequest {
  operation: ToolOperation;
  metadata?: Record<string, unknown>;
}

export interface ToolDiscoverRequest extends ToolOperationRequest {
  operation: ToolOperation.DISCOVER;
  category?: string;
  tags?: string[];
  enabled?: boolean;
}

export interface ToolFindRequest extends ToolOperationRequest {
  operation: ToolOperation.FIND;
  toolName: string;
}

export interface ToolListRequest extends ToolOperationRequest {
  operation: ToolOperation.LIST;
  category?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

export interface ToolExecuteRequest extends ToolOperationRequest {
  operation: ToolOperation.EXECUTE;
  toolName: string;
  input: unknown;
  timeout?: number;
  retries?: number;
}

export interface ToolBatchExecuteRequest extends ToolOperationRequest {
  operation: ToolOperation.EXECUTE_BATCH;
  executions: {
    toolName: string;
    input: unknown;
    timeout?: number;
    retries?: number;
  }[];
  mode: BatchExecutionMode;
  failFast?: boolean;
  maxConcurrency?: number;
}

export interface ToolValidateRequest extends ToolOperationRequest {
  operation: ToolOperation.VALIDATE;
  toolName: string;
  input: unknown;
  validateInput?: boolean;
  validateOutput?: boolean;
}

export interface ToolOperationResult {
  success: boolean;
  operation: ToolOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ToolDiscoverResult extends ToolOperationResult {
  operation: ToolOperation.DISCOVER;
  tools: ITool[];
  totalCount: number;
  categories: string[];
  tags: string[];
}

export interface ToolFindResult extends ToolOperationResult {
  operation: ToolOperation.FIND;
  tool?: ITool;
  found: boolean;
}

export interface ToolListResult extends ToolOperationResult {
  operation: ToolOperation.LIST;
  tools: ITool[];
  totalCount: number;
  offset: number;
  limit: number;
}

export interface ToolExecuteResult extends ToolOperationResult {
  operation: ToolOperation.EXECUTE;
  toolName: string;
  input: unknown;
  output?: unknown;
  duration: number;
  executedAt: Date;
}

export interface ToolBatchExecuteResult extends ToolOperationResult {
  operation: ToolOperation.EXECUTE_BATCH;
  mode: BatchExecutionMode;
  executions: {
    toolName: string;
    input: unknown;
    output?: unknown;
    success: boolean;
    error?: string;
    duration: number;
  }[];
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalDuration: number;
  executedAt: Date;
}

export interface ToolValidateResult extends ToolOperationResult {
  operation: ToolOperation.VALIDATE;
  toolName: string;
  input: unknown;
  inputValid: boolean;
  outputValid?: boolean;
  inputErrors: string[];
  outputErrors: string[];
}

export interface ToolAgentHealth {
  toolRegistryAvailable: boolean;
  executorAvailable: boolean;
  registeredToolCount: number;
  enabledToolCount: number;
  status: "healthy" | "degraded" | "unhealthy";
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface ToolAgentMetrics {
  operationCounts: Record<ToolOperation, number>;
  successCounts: Record<ToolOperation, number>;
  errorCounts: Record<ToolOperation, number>;
  averageLatencies: Record<ToolOperation, number>;

  totalExecutions: number;
  successRate: number;
  uptime: number;

  toolUsage: Record<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      averageLatency: number;
    }
  >;

  batchExecutionStats: {
    totalBatches: number;
    parallelBatches: number;
    sequentialBatches: number;
    averageBatchSize: number;
    averageBatchTime: number;
  };
}
