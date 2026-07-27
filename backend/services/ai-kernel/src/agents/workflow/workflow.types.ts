import { AgentPriority } from "../types";

export enum WorkflowState {
  CREATED = "created",
  VALIDATED = "validated",
  RUNNING = "running",
  PAUSED = "paused",
  FAILED = "failed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum WorkflowStepType {
  TASK = "task",
  SEQUENCE = "sequence",
  PARALLEL = "parallel",
  CONDITIONAL = "conditional",
  LOOP = "loop",
  COMPENSATION = "compensation",
}

export enum WorkflowExecutionMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  MIXED = "mixed",
}

export interface WorkflowExecutionContext {
  requestId: string;
  traceId: string;
  workspaceId: string;
  conversationId?: string;
  userId: string;
  agentId: string;
  executionId: string;
  metadata: Record<string, unknown>;
  startTime: Date;
  variables: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryableErrors: string[];
}

export interface TimeoutPolicy {
  stepTimeoutMs: number;
  workflowTimeoutMs: number;
  enableGlobalTimeout: boolean;
}

export interface FailurePolicy {
  continueOnError: boolean;
  maxFailures: number;
  failFast: boolean;
  compensationRequired: boolean;
}

export interface WorkflowCondition {
  type: "expression" | "function" | "variable";
  expression: string;
  variables: string[];
}

export interface WorkflowLoop {
  type: "while" | "for" | "forEach";
  condition: WorkflowCondition;
  maxIterations: number;
  breakOnError: boolean;
}

export interface WorkflowStep {
  stepId: string;
  name: string;
  type: WorkflowStepType;
  enabled: boolean;

  // Task execution
  agentId?: string;
  taskName?: string;
  input?: unknown;

  // Control flow
  condition?: WorkflowCondition;
  loop?: WorkflowLoop;

  // Nested steps (for sequences, parallels, conditionals)
  steps?: WorkflowStep[];

  // Compensation
  compensationStepId?: string;

  // Policies
  retryPolicy?: RetryPolicy;
  timeoutMs?: number;

  // Dependencies
  dependsOn: string[];

  metadata: Record<string, unknown>;
}

export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  version: string;

  // Execution properties
  executionMode: WorkflowExecutionMode;
  priority: AgentPriority;

  // Steps
  steps: WorkflowStep[];

  // Policies
  retryPolicy: RetryPolicy;
  timeoutPolicy: TimeoutPolicy;
  failurePolicy: FailurePolicy;

  // Context
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;

  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  state: WorkflowState;

  context: WorkflowExecutionContext;

  // Execution tracking
  currentStepId?: string;
  completedSteps: string[];
  failedSteps: string[];
  compensatedSteps: string[];

  // Results
  input: unknown;
  output?: unknown;
  error?: string;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  // Metrics
  stepCount: number;
  failureCount: number;
  retryCount: number;

  metadata: Record<string, unknown>;
}

export interface StepExecution {
  stepId: string;
  executionId: string;
  state: WorkflowState;

  input?: unknown;
  output?: unknown;
  error?: string;

  attempts: number;
  maxAttempts: number;

  startedAt: Date;
  completedAt?: Date;
  duration?: number;

  metadata: Record<string, unknown>;
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;

  averageDuration: number;
  totalDuration: number;

  stepMetrics: Record<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      averageDuration: number;
    }
  >;

  lastExecutionAt?: Date;
}

export interface CompensationAction {
  stepId: string;
  action: "rollback" | "cleanup" | "notify" | "custom";
  parameters: Record<string, unknown>;
  executed: boolean;
  executedAt?: Date;
  error?: string;
}
