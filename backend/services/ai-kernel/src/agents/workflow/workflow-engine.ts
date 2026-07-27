import { randomUUID } from "crypto";
import {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowExecutionContext,
  WorkflowState,
  WorkflowStep,
  StepExecution,
  CompensationAction,
  WorkflowStepType,
} from "./workflow.types";
import {
  IWorkflowEngine,
  IWorkflowExecutor,
  IWorkflowRegistry,
  WorkflowValidationResult,
} from "./workflow.interface";
import { WorkflowRunner } from "./workflow-runner";
import {
  WorkflowNotFoundException,
  WorkflowValidationException,
  WorkflowExecutionException,
  WorkflowStepException,
  WorkflowTimeoutException,
  WorkflowCancelledException,
} from "./workflow.exceptions";

export class WorkflowEngine implements IWorkflowEngine, IWorkflowExecutor {
  private readonly executions: Map<string, WorkflowExecution> = new Map();
  private readonly stepExecutions: Map<string, Map<string, StepExecution>> =
    new Map();
  private readonly runner: WorkflowRunner;

  constructor(private readonly registry: IWorkflowRegistry) {
    this.runner = new WorkflowRunner(this);
  }

  public async validate(
    workflow: WorkflowDefinition,
  ): Promise<WorkflowValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!workflow.workflowId) {
        errors.push("Workflow ID is required");
      }

      if (!workflow.name) {
        errors.push("Workflow name is required");
      }

      if (!workflow.steps || workflow.steps.length === 0) {
        errors.push("Workflow must have at least one step");
      }

      // Validate steps
      const stepIds = new Set<string>();
      for (const step of workflow.steps) {
        this.validateStep(step, stepIds, errors, warnings);
      }

      // Check for orphaned steps (steps with no path to them)
      this.validateStepConnectivity(workflow.steps, errors, warnings);

      // Validate execution policies
      this.validatePolicies(workflow, errors, warnings);
    } catch (error) {
      errors.push(
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public async compile(
    workflow: WorkflowDefinition,
  ): Promise<WorkflowDefinition> {
    // Validate workflow first
    const validation = await this.validate(workflow);
    if (!validation.valid) {
      throw new WorkflowValidationException(
        workflow.workflowId,
        validation.errors,
      );
    }

    // Create compiled version with optimizations
    const compiled: WorkflowDefinition = {
      ...workflow,
      updatedAt: new Date(),
      metadata: {
        ...workflow.metadata,
        compiled: true,
        compiledAt: new Date(),
        stepCount: this.countTotalSteps(workflow.steps),
      },
    };

    return compiled;
  }

  public async execute(
    workflowId: string,
    input: unknown,
    context: WorkflowExecutionContext,
  ): Promise<WorkflowExecution> {
    const workflow = await this.registry.find(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundException(workflowId);
    }

    const executionId = randomUUID();
    const execution: WorkflowExecution = {
      executionId,
      workflowId,
      state: WorkflowState.RUNNING,
      context,
      input,
      currentStepId: undefined,
      completedSteps: [],
      failedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
      stepCount: this.countTotalSteps(workflow.steps),
      failureCount: 0,
      retryCount: 0,
      metadata: {
        workflowName: workflow.name,
        workflowVersion: workflow.version,
        executionMode: workflow.executionMode,
        ...workflow.failurePolicy,
      },
    };

    // Store execution
    this.executions.set(executionId, execution);
    this.stepExecutions.set(executionId, new Map());

    try {
      // Set up timeout if specified
      let timeoutHandle: NodeJS.Timeout | undefined;
      if (workflow.timeoutPolicy.enableGlobalTimeout) {
        timeoutHandle = setTimeout(() => {
          execution.state = WorkflowState.FAILED;
          execution.error = `Workflow timeout after ${workflow.timeoutPolicy.workflowTimeoutMs}ms`;
          execution.completedAt = new Date();
        }, workflow.timeoutPolicy.workflowTimeoutMs);
      }

      // Execute workflow steps based on execution mode
      await this.executeWorkflowSteps(workflow, execution);

      // Clear timeout if execution completed successfully
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Set final state
      if (execution.state === WorkflowState.RUNNING) {
        execution.state = WorkflowState.COMPLETED;
        execution.output = this.extractWorkflowOutput(workflow, execution);
      }

      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      return execution;
    } catch (error) {
      execution.state = WorkflowState.FAILED;
      execution.error =
        error instanceof Error ? error.message : "Unknown execution error";
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      // Run compensation if required
      if (workflow.failurePolicy.compensationRequired) {
        await this.runner.runCompensation(execution.completedSteps, execution);
      }

      throw new WorkflowExecutionException(
        executionId,
        workflowId,
        execution.currentStepId,
        error instanceof Error ? error.message : "Unknown execution error",
      );
    }
  }

  public async cancel(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return false;
    }

    if (
      execution.state !== WorkflowState.RUNNING &&
      execution.state !== WorkflowState.PAUSED
    ) {
      return false; // Already completed
    }

    execution.state = WorkflowState.CANCELLED;
    execution.completedAt = new Date();
    execution.duration =
      execution.completedAt.getTime() - execution.startedAt.getTime();

    return true;
  }

  public async pause(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.state !== WorkflowState.RUNNING) {
      return false;
    }

    execution.state = WorkflowState.PAUSED;
    return true;
  }

  public async resume(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.state !== WorkflowState.PAUSED) {
      return false;
    }

    execution.state = WorkflowState.RUNNING;

    // Continue execution from where it left off
    try {
      const workflow = await this.registry.find(execution.workflowId);
      if (workflow) {
        await this.executeWorkflowSteps(workflow, execution);
      }
    } catch (error) {
      execution.state = WorkflowState.FAILED;
      execution.error =
        error instanceof Error ? error.message : "Resume failed";
    }

    return true;
  }

  // IWorkflowExecutor implementation
  public async executeStep(
    stepId: string,
    execution: WorkflowExecution,
  ): Promise<StepExecution> {
    const workflow = await this.registry.find(execution.workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundException(execution.workflowId);
    }

    const step = this.findStep(stepId, workflow.steps);
    if (!step) {
      throw new WorkflowStepException(
        stepId,
        execution.executionId,
        "unknown",
        "Step not found",
      );
    }

    const stepExecution: StepExecution = {
      stepId,
      executionId: execution.executionId,
      state: WorkflowState.RUNNING,
      attempts: 1,
      maxAttempts:
        step.retryPolicy?.maxAttempts || workflow.retryPolicy.maxAttempts,
      startedAt: new Date(),
      metadata: {
        stepType: step.type,
        stepName: step.name,
      },
    };

    try {
      // Get step input
      stepExecution.input = await this.getStepInput(stepId, execution);

      // Execute based on step type
      switch (step.type) {
        case WorkflowStepType.TASK:
          stepExecution.output = await this.executeTaskStep(
            step,
            stepExecution,
            execution,
          );
          break;

        case WorkflowStepType.SEQUENCE:
          if (step.steps) {
            const stepIds = step.steps.map((s) => s.stepId);
            await this.runner.runSequential(stepIds, execution);
          }
          stepExecution.output = { sequenceCompleted: true };
          break;

        case WorkflowStepType.PARALLEL:
          if (step.steps) {
            const stepIds = step.steps.map((s) => s.stepId);
            await this.runner.runParallel(stepIds, execution);
          }
          stepExecution.output = { parallelCompleted: true };
          break;

        case WorkflowStepType.CONDITIONAL:
          if (step.condition && step.steps) {
            const thenSteps = step.steps
              .filter((s) => s.metadata.branch === "then")
              .map((s) => s.stepId);
            const elseSteps = step.steps
              .filter((s) => s.metadata.branch === "else")
              .map((s) => s.stepId);
            await this.runner.runConditional(
              step.condition.expression,
              thenSteps,
              elseSteps,
              execution,
            );
          }
          stepExecution.output = { conditionalCompleted: true };
          break;

        case WorkflowStepType.LOOP:
          if (step.loop && step.steps) {
            const stepIds = step.steps.map((s) => s.stepId);
            await this.runner.runLoop(step.loop, stepIds, execution);
          }
          stepExecution.output = { loopCompleted: true };
          break;

        default:
          throw new Error(`Unsupported step type: ${step.type}`);
      }

      stepExecution.state = WorkflowState.COMPLETED;
      stepExecution.completedAt = new Date();
      stepExecution.duration =
        stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
    } catch (error) {
      stepExecution.state = WorkflowState.FAILED;
      stepExecution.error =
        error instanceof Error ? error.message : "Unknown step error";
      stepExecution.completedAt = new Date();
      stepExecution.duration =
        stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
    }

    // Store step execution
    const executionSteps = this.stepExecutions.get(execution.executionId)!;
    executionSteps.set(stepId, stepExecution);

    return stepExecution;
  }

  public async compensateStep(
    stepId: string,
    execution: WorkflowExecution,
  ): Promise<CompensationAction> {
    const action: CompensationAction = {
      stepId,
      action: "rollback",
      parameters: {},
      executed: false,
    };

    try {
      // Implement compensation logic based on step type
      // For now, this is a placeholder implementation
      action.executed = true;
      action.executedAt = new Date();
    } catch (error) {
      action.error =
        error instanceof Error ? error.message : "Compensation failed";
    }

    return action;
  }

  public async evaluateCondition(
    condition: string,
    context: WorkflowExecutionContext,
  ): Promise<boolean> {
    // Simple expression evaluation - in a real implementation, this would use a proper expression engine
    try {
      // For demo purposes, evaluate simple variable-based conditions
      if (condition.includes("variables.")) {
        const variablePath = condition.replace("variables.", "");
        const value = this.getNestedValue(context.variables, variablePath);
        return Boolean(value);
      }

      // Default: try to evaluate as a JavaScript expression (unsafe - use proper expression engine in production)
      return Boolean(eval(condition));
    } catch {
      return false;
    }
  }

  public async getStepInput(
    stepId: string,
    execution: WorkflowExecution,
  ): Promise<unknown> {
    // Get input from previous steps or workflow input
    if (execution.completedSteps.length === 0) {
      return execution.input;
    }

    // For now, return the output of the last completed step
    const lastStepId =
      execution.completedSteps[execution.completedSteps.length - 1];
    const executionSteps = this.stepExecutions.get(execution.executionId);
    const lastStepExecution = executionSteps?.get(lastStepId);

    return lastStepExecution?.output || execution.input;
  }

  private async executeWorkflowSteps(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
  ): Promise<void> {
    const rootStepIds = workflow.steps.map((step) => step.stepId);

    switch (workflow.executionMode) {
      case "sequential":
        await this.runner.runSequential(rootStepIds, execution);
        break;

      case "parallel":
        await this.runner.runParallel(rootStepIds, execution);
        break;

      case "mixed":
        // For mixed mode, we'll execute sequentially by default
        // In a real implementation, this would be more sophisticated
        await this.runner.runSequential(rootStepIds, execution);
        break;
    }
  }

  private async executeTaskStep(
    step: WorkflowStep,
    stepExecution: StepExecution,
    execution: WorkflowExecution,
  ): Promise<unknown> {
    // Placeholder task execution - in a real implementation, this would delegate to agents
    return {
      taskId: step.stepId,
      agentId: step.agentId,
      taskName: step.taskName,
      executedAt: new Date(),
      input: stepExecution.input,
    };
  }

  private validateStep(
    step: WorkflowStep,
    stepIds: Set<string>,
    errors: string[],
    warnings: string[],
  ): void {
    if (!step.stepId) {
      errors.push("Step ID is required");
      return;
    }

    if (stepIds.has(step.stepId)) {
      errors.push(`Duplicate step ID: ${step.stepId}`);
    } else {
      stepIds.add(step.stepId);
    }

    if (!step.name) {
      errors.push(`Step name is required for step ${step.stepId}`);
    }

    // Validate step type-specific requirements
    if (step.type === WorkflowStepType.TASK && !step.agentId) {
      warnings.push(`Task step ${step.stepId} has no agent ID specified`);
    }

    // Recursively validate nested steps
    if (step.steps) {
      for (const nestedStep of step.steps) {
        this.validateStep(nestedStep, stepIds, errors, warnings);
      }
    }
  }

  private validateStepConnectivity(
    steps: WorkflowStep[],
    errors: string[],
    warnings: string[],
  ): void {
    // Check that all dependency references are valid
    const allStepIds = this.collectAllStepIds(steps);

    for (const step of steps) {
      for (const depId of step.dependsOn) {
        if (!allStepIds.has(depId)) {
          errors.push(
            `Step ${step.stepId} depends on non-existent step: ${depId}`,
          );
        }
      }
    }
  }

  private validatePolicies(
    workflow: WorkflowDefinition,
    errors: string[],
    warnings: string[],
  ): void {
    // Validate retry policy
    if (workflow.retryPolicy.maxAttempts < 1) {
      errors.push("Retry policy maxAttempts must be at least 1");
    }

    // Validate timeout policy
    if (workflow.timeoutPolicy.stepTimeoutMs <= 0) {
      errors.push("Step timeout must be positive");
    }

    if (workflow.timeoutPolicy.workflowTimeoutMs <= 0) {
      errors.push("Workflow timeout must be positive");
    }
  }

  private collectAllStepIds(steps: WorkflowStep[]): Set<string> {
    const stepIds = new Set<string>();

    for (const step of steps) {
      stepIds.add(step.stepId);
      if (step.steps) {
        const nestedIds = this.collectAllStepIds(step.steps);
        nestedIds.forEach((id) => stepIds.add(id));
      }
    }

    return stepIds;
  }

  private findStep(
    stepId: string,
    steps: WorkflowStep[],
  ): WorkflowStep | undefined {
    for (const step of steps) {
      if (step.stepId === stepId) {
        return step;
      }
      if (step.steps) {
        const found = this.findStep(stepId, step.steps);
        if (found) return found;
      }
    }
    return undefined;
  }

  private countTotalSteps(steps: WorkflowStep[]): number {
    let count = steps.length;
    for (const step of steps) {
      if (step.steps) {
        count += this.countTotalSteps(step.steps);
      }
    }
    return count;
  }

  private extractWorkflowOutput(
    workflow: WorkflowDefinition,
    execution: WorkflowExecution,
  ): unknown {
    // Extract output from the last step or combine outputs
    const executionSteps = this.stepExecutions.get(execution.executionId);
    if (!executionSteps || executionSteps.size === 0) {
      return null;
    }

    const outputs: Record<string, unknown> = {};
    for (const [stepId, stepExecution] of executionSteps) {
      if (stepExecution.state === WorkflowState.COMPLETED) {
        outputs[stepId] = stepExecution.output;
      }
    }

    return outputs;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current, key) => {
      return current && typeof current === "object"
        ? (current as any)[key]
        : undefined;
    }, obj);
  }
}
