import { ExecutionRequest, BatchExecutionRequest, ExecutionResult, BatchExecutionResult } from "../../types";

export enum ExecutionOperation {
  EXECUTE = "execute",
  EXECUTE_BATCH = "execute-batch",
  CANCEL = "cancel",
  STATUS = "status"
}

export interface ExecutionOperationRequest {
  operation: ExecutionOperation;
  metadata?: Record<string, unknown>;
}

export interface ExecuteAgentRequest extends ExecutionOperationRequest {
  operation: ExecutionOperation.EXECUTE;
  executionRequest: ExecutionRequest;
}

export interface ExecuteBatchRequest extends ExecutionOperationRequest {
  operation: ExecutionOperation.EXECUTE_BATCH;
  batchRequest: BatchExecutionRequest;
}

export interface CancelExecutionRequest extends ExecutionOperationRequest {
  operation: ExecutionOperation.CANCEL;
  executionId: string;
}

export interface ExecutionStatusRequest extends ExecutionOperationRequest {
  operation: ExecutionOperation.STATUS;
  executionId: string;
}

export interface ExecutionOperationResult {
  success: boolean;
  operation: ExecutionOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ExecuteAgentResult extends ExecutionOperationResult {
  operation: ExecutionOperation.EXECUTE;
  executionId: string;
  agentId: string;
  result?: ExecutionResult;
  startedAt: Date;
}

export interface ExecuteBatchResult extends ExecutionOperationResult {
  operation: ExecutionOperation.EXECUTE_BATCH;
  batchId: string;
  totalRequests: number;
  result?: BatchExecutionResult;
  startedAt: Date;
}

export interface CancelExecutionResult extends ExecutionOperationResult {
  operation: ExecutionOperation.CANCEL;
  executionId: string;
  cancelled: boolean;
  cancelledAt: Date;
}

export interface ExecutionStatusResult extends ExecutionOperationResult {
  operation: ExecutionOperation.STATUS;
  executionId: string;
  result?: ExecutionResult;
  retrievedAt: Date;
}

export interface ExecutionAgentHealth {
  runtimeAvailable: boolean;
  executorAvailable: boolean;
  registryAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface ExecutionAgentMetrics {
  operationCounts: Record<ExecutionOperation, number>;
  successCounts: Record<ExecutionOperation, number>;
  errorCounts: Record<ExecutionOperation, number>;
  averageLatencies: Record<ExecutionOperation, number>;
  
  totalOperations: number;
  successRate: number;
  uptime: number;
  
  executionStats: {
    totalExecutions: number;
    singleExecutions: number;
    batchExecutions: number;
    averageExecutionTime: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    timeoutExecutions: number;
  };
  
  operationStats: {
    totalCancellations: number;
    successfulCancellations: number;
    totalStatusQueries: number;
    totalCleanups: number;
    batchConcurrency: {
      averageRequests: number;
      maxConcurrency: number;
      failFastUsage: number;
    };
  };
}