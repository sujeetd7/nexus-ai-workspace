import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowExecutionContext,
  WorkflowMetrics,
  StepExecution,
  CompensationAction,
} from "./workflow.types";

export interface IWorkflowRegistry {
  register(workflow: WorkflowDefinition): Promise<void>;
  remove(workflowId: string): Promise<boolean>;
  find(workflowId: string): Promise<WorkflowDefinition | undefined>;
  list(): Promise<WorkflowDefinition[]>;
  exists(workflowId: string): Promise<boolean>;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IWorkflowEngine {
  validate(workflow: WorkflowDefinition): Promise<WorkflowValidationResult>;
  compile(workflow: WorkflowDefinition): Promise<WorkflowDefinition>;
  execute(
    workflowId: string,
    input: unknown,
    context: WorkflowExecutionContext,
  ): Promise<WorkflowExecution>;
  cancel(executionId: string): Promise<boolean>;
  pause(executionId: string): Promise<boolean>;
  resume(executionId: string): Promise<boolean>;
}

export interface IWorkflowRunner {
  runSequential(steps: string[], execution: WorkflowExecution): Promise<void>;
  runParallel(steps: string[], execution: WorkflowExecution): Promise<void>;
  runConditional(
    condition: string,
    thenSteps: string[],
    elseSteps: string[],
    execution: WorkflowExecution,
  ): Promise<void>;
  runLoop(
    loopConfig: unknown,
    steps: string[],
    execution: WorkflowExecution,
  ): Promise<void>;
}

export interface IWorkflowExecutor {
  executeStep(
    stepId: string,
    execution: WorkflowExecution,
  ): Promise<StepExecution>;
  compensateStep(
    stepId: string,
    execution: WorkflowExecution,
  ): Promise<CompensationAction>;
  evaluateCondition(
    condition: string,
    context: WorkflowExecutionContext,
  ): Promise<boolean>;
  getStepInput(stepId: string, execution: WorkflowExecution): Promise<unknown>;
}

export interface IWorkflowMonitor {
  getExecution(executionId: string): Promise<WorkflowExecution | undefined>;
  listExecutions(workflowId?: string): Promise<WorkflowExecution[]>;
  getMetrics(workflowId: string): Promise<WorkflowMetrics>;
  getStepExecutions(executionId: string): Promise<StepExecution[]>;
}

export interface WorkflowHealth {
  status: "healthy" | "degraded" | "unhealthy";
  totalWorkflows: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  errors: string[];
  warnings: string[];
  lastActivity: Date;
}
