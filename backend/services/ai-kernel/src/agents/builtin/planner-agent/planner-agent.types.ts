import { AgentPlan, ExecutionMode } from "../../planner/agent-plan";
import { AgentTask } from "../../planner/agent-task";
import { PlanningRequest, PlanValidationResult, TaskSplitResult } from "../../planner/agent-planner";
import { AgentPriority } from "../../types";

export enum PlannerOperation {
  PLAN = "plan",
  REPLAN = "replan", 
  VALIDATE = "validate",
  ESTIMATE = "estimate"
}

export interface PlannerOperationRequest {
  operation: PlannerOperation;
  metadata?: Record<string, unknown>;
}

export interface PlannerPlanRequest extends PlannerOperationRequest {
  operation: PlannerOperation.PLAN;
  agentId: string;
  workspaceId: string;
  name: string;
  description?: string;
  priority: AgentPriority;
  tasks: Partial<AgentTask>[];
  executionMode?: ExecutionMode;
  maxConcurrency?: number;
  timeoutMs?: number;
}

export interface PlannerReplanRequest extends PlannerOperationRequest {
  operation: PlannerOperation.REPLAN;
  existingPlan: AgentPlan;
  modifications?: {
    addTasks?: Partial<AgentTask>[];
    removeTasks?: string[];
    updateTasks?: { taskId: string; updates: Partial<AgentTask> }[];
    changeMode?: ExecutionMode;
    changePriority?: AgentPriority;
  };
  reason?: string;
}

export interface PlannerValidateRequest extends PlannerOperationRequest {
  operation: PlannerOperation.VALIDATE;
  plan: AgentPlan;
  strict?: boolean;
}

export interface PlannerEstimateRequest extends PlannerOperationRequest {
  operation: PlannerOperation.ESTIMATE;
  plan: AgentPlan;
  includeTaskBreakdown?: boolean;
}

export interface PlannerOperationResult {
  success: boolean;
  operation: PlannerOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface PlannerPlanResult extends PlannerOperationResult {
  operation: PlannerOperation.PLAN;
  plan?: AgentPlan;
  planId?: string;
  taskCount: number;
  estimatedDuration: number;
  createdAt: Date;
}

export interface PlannerReplanResult extends PlannerOperationResult {
  operation: PlannerOperation.REPLAN;
  plan?: AgentPlan;
  planId?: string;
  originalPlanId: string;
  changesApplied: {
    tasksAdded: number;
    tasksRemoved: number;
    tasksUpdated: number;
    modeChanged: boolean;
    priorityChanged: boolean;
  };
  newEstimatedDuration: number;
  replanedAt: Date;
}

export interface PlannerValidateResult extends PlannerOperationResult {
  operation: PlannerOperation.VALIDATE;
  planId: string;
  valid: boolean;
  validationResult: PlanValidationResult;
  validatedAt: Date;
}

export interface PlannerEstimateResult extends PlannerOperationResult {
  operation: PlannerOperation.ESTIMATE;
  planId: string;
  estimatedDurationMs: number;
  taskBreakdown?: {
    taskId: string;
    taskName: string;
    estimatedDuration: number;
    dependencies: string[];
  }[];
  estimatedAt: Date;
}

export interface PlannerAgentHealth {
  plannerAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  activePlans: number;
  totalPlansCreated: number;
  averagePlanComplexity: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface PlannerAgentMetrics {
  operationCounts: Record<PlannerOperation, number>;
  successCounts: Record<PlannerOperation, number>;
  errorCounts: Record<PlannerOperation, number>;
  averageLatencies: Record<PlannerOperation, number>;
  
  totalOperations: number;
  successRate: number;
  uptime: number;
  
  planningStats: {
    totalPlansCreated: number;
    totalReplans: number;
    averageTasksPerPlan: number;
    averagePlanDuration: number;
    plansByMode: Record<ExecutionMode, number>;
    plansByPriority: Record<AgentPriority, number>;
  };
  
  validationStats: {
    totalValidations: number;
    validPlans: number;
    invalidPlans: number;
    averageValidationTime: number;
    commonErrors: Record<string, number>;
  };
  
  estimationAccuracy: {
    totalEstimates: number;
    averageEstimation: number;
    estimationDistribution: {
      under1Min: number;
      under5Min: number;
      under15Min: number;
      under1Hour: number;
      over1Hour: number;
    };
  };
}