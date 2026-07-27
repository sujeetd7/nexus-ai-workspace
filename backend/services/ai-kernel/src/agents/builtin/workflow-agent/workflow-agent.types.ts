import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowExecutionContext,
} from "../../workflow";

export enum WorkflowOperation {
  EXECUTE_WORKFLOW = "execute-workflow",
  VALIDATE_WORKFLOW = "validate-workflow",
  PAUSE_WORKFLOW = "pause-workflow",
  RESUME_WORKFLOW = "resume-workflow",
  CANCEL_WORKFLOW = "cancel-workflow",
}

export interface WorkflowOperationRequest {
  operation: WorkflowOperation;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecuteRequest extends WorkflowOperationRequest {
  operation: WorkflowOperation.EXECUTE_WORKFLOW;
  workflowId: string;
  input: unknown;
  context: Omit<WorkflowExecutionContext, "executionId"> & {
    timeout?: number;
  };
}

export interface WorkflowValidateRequest extends WorkflowOperationRequest {
  operation: WorkflowOperation.VALIDATE_WORKFLOW;
  workflow: WorkflowDefinition;
}

export interface WorkflowPauseRequest extends WorkflowOperationRequest {
  operation: WorkflowOperation.PAUSE_WORKFLOW;
  executionId: string;
}

export interface WorkflowResumeRequest extends WorkflowOperationRequest {
  operation: WorkflowOperation.RESUME_WORKFLOW;
  executionId: string;
}

export interface WorkflowCancelRequest extends WorkflowOperationRequest {
  operation: WorkflowOperation.CANCEL_WORKFLOW;
  executionId: string;
}

export interface WorkflowOperationResult {
  success: boolean;
  operation: WorkflowOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowExecuteResult extends WorkflowOperationResult {
  operation: WorkflowOperation.EXECUTE_WORKFLOW;
  workflowId: string;
  executionId: string;
  execution?: WorkflowExecution;
  startedAt: Date;
}

export interface WorkflowValidateResult extends WorkflowOperationResult {
  operation: WorkflowOperation.VALIDATE_WORKFLOW;
  workflowId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: Date;
}

export interface WorkflowPauseResult extends WorkflowOperationResult {
  operation: WorkflowOperation.PAUSE_WORKFLOW;
  executionId: string;
  paused: boolean;
  pausedAt: Date;
}

export interface WorkflowResumeResult extends WorkflowOperationResult {
  operation: WorkflowOperation.RESUME_WORKFLOW;
  executionId: string;
  resumed: boolean;
  resumedAt: Date;
}

export interface WorkflowCancelResult extends WorkflowOperationResult {
  operation: WorkflowOperation.CANCEL_WORKFLOW;
  executionId: string;
  cancelled: boolean;
  cancelledAt: Date;
}

export interface WorkflowAgentHealth {
  workflowEngineAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  totalWorkflows: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface WorkflowAgentMetrics {
  operationCounts: Record<WorkflowOperation, number>;
  successCounts: Record<WorkflowOperation, number>;
  errorCounts: Record<WorkflowOperation, number>;
  averageLatencies: Record<WorkflowOperation, number>;

  totalOperations: number;
  successRate: number;
  uptime: number;

  workflowStats: {
    totalExecutions: number;
    currentlyRunning: number;
    averageExecutionTime: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
  };

  operationStats: {
    totalValidations: number;
    validWorkflows: number;
    invalidWorkflows: number;
    totalPauses: number;
    totalResumes: number;
    totalCancellations: number;
  };
}
