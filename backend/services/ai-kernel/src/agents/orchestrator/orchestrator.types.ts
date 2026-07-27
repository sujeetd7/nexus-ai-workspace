import { AgentPriority } from "../types";
import { ExecutionResult } from "../types";
import { WorkflowExecution } from "../workflow";
import { AgentPlan } from "../planner";

export enum OrchestratorState {
  INITIALIZING = "initializing",
  RUNNING = "running",
  PAUSED = "paused",
  STOPPING = "stopping",
  STOPPED = "stopped",
  ERROR = "error",
}

export enum ExecutionType {
  SINGLE_AGENT = "single_agent",
  MULTIPLE_AGENTS = "multiple_agents",
  WORKFLOW = "workflow",
  PLAN = "plan",
}

export enum OrchestratorExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  PAUSED = "paused",
}

export interface OrchestratorExecutionContext {
  requestId: string;
  traceId: string;
  workspaceId: string;
  conversationId?: string;
  executionId: string;
  userId: string;
  metadata: Record<string, unknown>;
  startTime: Date;
  timeout?: number;
  cancellationToken?: AbortSignal;
}

export interface AgentExecutionRequest {
  agentId: string;
  input: unknown;
  context: OrchestratorExecutionContext;
  priority?: AgentPriority;
  timeout?: number;
  retryAttempts?: number;
}

export interface MultiAgentExecutionRequest {
  agents: AgentExecutionRequest[];
  executionMode: "sequential" | "parallel" | "mixed";
  maxConcurrency?: number;
  failFast?: boolean;
  context: OrchestratorExecutionContext;
}

export interface WorkflowExecutionRequest {
  workflowId: string;
  input: unknown;
  context: OrchestratorExecutionContext;
  variables?: Record<string, unknown>;
}

export interface PlanExecutionRequest {
  planId?: string;
  plan?: AgentPlan;
  context: OrchestratorExecutionContext;
}

export interface OrchestratorExecution {
  executionId: string;
  type: ExecutionType;
  status: OrchestratorExecutionStatus;
  context: OrchestratorExecutionContext;

  // Request details
  request:
    | AgentExecutionRequest
    | MultiAgentExecutionRequest
    | WorkflowExecutionRequest
    | PlanExecutionRequest;

  // Execution tracking
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  // Results
  result?: ExecutionResult | WorkflowExecution | unknown;
  error?: string;

  // Metrics
  agentsInvolved: string[];
  memoryUsage: number;
  stepCount: number;

  metadata: Record<string, unknown>;
}

export interface OrchestratorHealth {
  status: "healthy" | "degraded" | "unhealthy";
  state: OrchestratorState;
  uptime: number;

  // Component health
  registeredAgents: number;
  runningAgents: number;
  queuedTasks: number;
  runningExecutions: number;
  runningWorkflows: number;

  // Resource usage
  memoryUsage: number;
  activeConnections: number;

  // Performance metrics
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;

  errors: string[];
  warnings: string[];
  lastActivity: Date;
}

export interface OrchestratorMetrics {
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;

  executionsByType: Record<ExecutionType, number>;
  averageExecutionTime: number;
  totalExecutionTime: number;

  agentMetrics: Record<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      averageTime: number;
    }
  >;

  workflowMetrics: Record<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      averageTime: number;
    }
  >;

  memoryMetrics: {
    totalAllocated: number;
    totalUsed: number;
    peakUsage: number;
  };

  queueMetrics: {
    currentSize: number;
    peakSize: number;
    averageWaitTime: number;
  };
}
