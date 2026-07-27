import {
  AgentExecutionRequest,
  WorkflowExecutionRequest,
  PlanExecutionRequest,
  OrchestratorExecution,
  OrchestratorHealth,
} from "../../orchestrator";

export enum OrchestratorOperation {
  EXECUTE = "execute",
  EXECUTE_WORKFLOW = "execute-workflow",
  EXECUTE_PLAN = "execute-plan",
  CANCEL = "cancel",
  HEALTH = "health",
}

export interface OrchestratorOperationRequest {
  operation: OrchestratorOperation;
  metadata?: Record<string, unknown>;
}

export interface OrchestratorExecuteAgentRequest extends OrchestratorOperationRequest {
  operation: OrchestratorOperation.EXECUTE;
  agentRequest: AgentExecutionRequest;
}

export interface OrchestratorExecuteWorkflowRequest extends OrchestratorOperationRequest {
  operation: OrchestratorOperation.EXECUTE_WORKFLOW;
  workflowRequest: WorkflowExecutionRequest;
}

export interface OrchestratorExecutePlanRequest extends OrchestratorOperationRequest {
  operation: OrchestratorOperation.EXECUTE_PLAN;
  planRequest: PlanExecutionRequest;
}

export interface OrchestratorCancelExecutionRequest extends OrchestratorOperationRequest {
  operation: OrchestratorOperation.CANCEL;
  executionId: string;
}

export interface GetHealthRequest extends OrchestratorOperationRequest {
  operation: OrchestratorOperation.HEALTH;
}

export interface OrchestratorOperationResult {
  success: boolean;
  operation: OrchestratorOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface OrchestratorExecuteAgentResult extends OrchestratorOperationResult {
  operation: OrchestratorOperation.EXECUTE;
  executionId: string;
  agentId: string;
  orchestratorExecution?: OrchestratorExecution;
  startedAt: Date;
}

export interface OrchestratorExecuteWorkflowResult extends OrchestratorOperationResult {
  operation: OrchestratorOperation.EXECUTE_WORKFLOW;
  executionId: string;
  workflowId: string;
  orchestratorExecution?: OrchestratorExecution;
  startedAt: Date;
}

export interface OrchestratorExecutePlanResult extends OrchestratorOperationResult {
  operation: OrchestratorOperation.EXECUTE_PLAN;
  executionId: string;
  planId: string;
  orchestratorExecution?: OrchestratorExecution;
  startedAt: Date;
}

export interface OrchestratorCancelExecutionResult extends OrchestratorOperationResult {
  operation: OrchestratorOperation.CANCEL;
  executionId: string;
  cancelled: boolean;
  cancelledAt: Date;
}

export interface GetHealthResult extends OrchestratorOperationResult {
  operation: OrchestratorOperation.HEALTH;
  orchestratorHealth: OrchestratorHealth;
  retrievedAt: Date;
}

export interface OrchestratorAgentHealth {
  orchestratorAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  state: string;
  runningExecutions: number;
  totalExecutions: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface OrchestratorAgentMetrics {
  operationCounts: Record<OrchestratorOperation, number>;
  successCounts: Record<OrchestratorOperation, number>;
  errorCounts: Record<OrchestratorOperation, number>;
  averageLatencies: Record<OrchestratorOperation, number>;

  totalOperations: number;
  successRate: number;
  uptime: number;

  executionStats: {
    totalExecutions: number;
    agentExecutions: number;
    workflowExecutions: number;
    planExecutions: number;
    runningExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    cancelledExecutions: number;
    averageExecutionTime: number;
  };

  orchestrationStats: {
    totalCancellations: number;
    successfulCancellations: number;
    totalHealthChecks: number;
    orchestratorUptime: number;
    componentAvailability: {
      agentRegistry: boolean;
      lifecycleManager: boolean;
      scheduler: boolean;
      planner: boolean;
      workflowEngine: boolean;
      agentRuntime: boolean;
      communicationManager: boolean;
      memory: boolean;
    };
  };
}
