import {
  WorkflowExecution,
  WorkflowState,
  StepExecution,
  WorkflowStep,
  WorkflowLoop,
  WorkflowCondition,
} from "./workflow.types";
import { IWorkflowRunner, IWorkflowExecutor } from "./workflow.interface";
import {
  WorkflowExecutionException,
  WorkflowStepException,
  WorkflowConditionException,
  WorkflowCancelledException,
} from "./workflow.exceptions";

export class WorkflowRunner implements IWorkflowRunner {
  constructor(private readonly executor: IWorkflowExecutor) {}

  public async runSequential(
    stepIds: string[],
    execution: WorkflowExecution,
  ): Promise<void> {
    for (const stepId of stepIds) {
      // Check for cancellation before each step
      if (execution.state === WorkflowState.CANCELLED) {
        throw new WorkflowCancelledException(execution.executionId);
      }

      // Check for pause
      if (execution.state === WorkflowState.PAUSED) {
        break; // Execution will resume from this point
      }

      try {
        execution.currentStepId = stepId;
        const stepExecution = await this.executor.executeStep(
          stepId,
          execution,
        );

        if (stepExecution.state === WorkflowState.COMPLETED) {
          execution.completedSteps.push(stepId);
        } else if (stepExecution.state === WorkflowState.FAILED) {
          execution.failedSteps.push(stepId);
          execution.failureCount++;

          // Check failure policy
          if (!this.shouldContinueOnFailure(execution)) {
            throw new WorkflowStepException(
              stepId,
              execution.executionId,
              "sequential",
            );
          }
        }
      } catch (error) {
        execution.failedSteps.push(stepId);
        execution.failureCount++;

        if (!this.shouldContinueOnFailure(execution)) {
          throw new WorkflowExecutionException(
            execution.executionId,
            execution.workflowId,
            stepId,
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      }
    }
  }

  public async runParallel(
    stepIds: string[],
    execution: WorkflowExecution,
  ): Promise<void> {
    const promises = stepIds.map(async (stepId) => {
      // Check for cancellation
      if (execution.state === WorkflowState.CANCELLED) {
        throw new WorkflowCancelledException(execution.executionId);
      }

      try {
        const stepExecution = await this.executor.executeStep(
          stepId,
          execution,
        );

        if (stepExecution.state === WorkflowState.COMPLETED) {
          execution.completedSteps.push(stepId);
        } else if (stepExecution.state === WorkflowState.FAILED) {
          execution.failedSteps.push(stepId);
          execution.failureCount++;
        }

        return stepExecution;
      } catch (error) {
        execution.failedSteps.push(stepId);
        execution.failureCount++;
        throw new WorkflowStepException(
          stepId,
          execution.executionId,
          "parallel",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    });

    try {
      const results = await Promise.allSettled(promises);

      // Check if any step failed and we should fail fast
      let hasFailures = false;
      for (const result of results) {
        if (result.status === "rejected") {
          hasFailures = true;
          break;
        }
      }

      if (hasFailures && !this.shouldContinueOnFailure(execution)) {
        throw new WorkflowExecutionException(
          execution.executionId,
          execution.workflowId,
          undefined,
          "Parallel execution failed",
        );
      }
    } catch (error) {
      throw new WorkflowExecutionException(
        execution.executionId,
        execution.workflowId,
        undefined,
        `Parallel execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async runConditional(
    condition: string,
    thenSteps: string[],
    elseSteps: string[],
    execution: WorkflowExecution,
  ): Promise<void> {
    try {
      const conditionResult = await this.executor.evaluateCondition(
        condition,
        execution.context,
      );

      const stepsToExecute = conditionResult ? thenSteps : elseSteps;

      if (stepsToExecute.length > 0) {
        await this.runSequential(stepsToExecute, execution);
      }
    } catch (error) {
      throw new WorkflowConditionException(
        condition,
        execution.executionId,
        `Conditional execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async runLoop(
    loopConfig: WorkflowLoop,
    steps: string[],
    execution: WorkflowExecution,
  ): Promise<void> {
    let iterations = 0;
    const maxIterations = loopConfig.maxIterations || 100;

    try {
      while (iterations < maxIterations) {
        // Check for cancellation
        if (execution.state === WorkflowState.CANCELLED) {
          throw new WorkflowCancelledException(execution.executionId);
        }

        // Evaluate loop condition
        let shouldContinue = false;

        try {
          shouldContinue = await this.evaluateLoopCondition(
            loopConfig,
            execution,
          );
        } catch (error) {
          throw new WorkflowConditionException(
            loopConfig.condition.expression,
            execution.executionId,
            `Loop condition evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }

        if (!shouldContinue) {
          break;
        }

        // Execute loop body
        try {
          // Update loop iteration context
          execution.context.variables = {
            ...execution.context.variables,
            loopIteration: iterations,
            loopMaxIterations: maxIterations,
          };

          await this.runSequential(steps, execution);
          iterations++;
        } catch (error) {
          if (loopConfig.breakOnError) {
            throw error;
          } else {
            // Continue with next iteration
            execution.failureCount++;
            iterations++;
          }
        }
      }

      if (iterations >= maxIterations) {
        throw new WorkflowExecutionException(
          execution.executionId,
          execution.workflowId,
          undefined,
          `Loop exceeded maximum iterations: ${maxIterations}`,
        );
      }
    } catch (error) {
      throw new WorkflowExecutionException(
        execution.executionId,
        execution.workflowId,
        undefined,
        `Loop execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async runCompensation(
    stepIds: string[],
    execution: WorkflowExecution,
  ): Promise<void> {
    // Execute compensation in reverse order
    const reversedStepIds = [...stepIds].reverse();

    for (const stepId of reversedStepIds) {
      try {
        await this.executor.compensateStep(stepId, execution);
        execution.compensatedSteps.push(stepId);
      } catch (error) {
        // Log compensation failure but continue with other compensations
        execution.metadata.compensationErrors =
          execution.metadata.compensationErrors || [];
        (execution.metadata.compensationErrors as string[]).push(
          `Failed to compensate step ${stepId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
  }

  private async evaluateLoopCondition(
    loopConfig: WorkflowLoop,
    execution: WorkflowExecution,
  ): Promise<boolean> {
    const condition = loopConfig.condition;

    switch (loopConfig.type) {
      case "while":
        return await this.executor.evaluateCondition(
          condition.expression,
          execution.context,
        );

      case "for":
        const currentIteration =
          (execution.context.variables.loopIteration as number) || 0;
        const maxIterations = loopConfig.maxIterations;
        return currentIteration < maxIterations;

      case "forEach":
        // For forEach, check if there are remaining items in the collection
        const collection = execution.context.variables[
          condition.variables[0]
        ] as unknown[];
        const forEachIndex =
          (execution.context.variables.forEachIndex as number) || 0;
        return Array.isArray(collection) && forEachIndex < collection.length;

      default:
        throw new Error(`Unsupported loop type: ${loopConfig.type}`);
    }
  }

  private shouldContinueOnFailure(execution: WorkflowExecution): boolean {
    // This would typically check the workflow's failure policy
    // For now, we'll implement a simple check based on metadata
    const continueOnError =
      (execution.metadata.continueOnError as boolean) || false;
    const maxFailures = (execution.metadata.maxFailures as number) || 0;

    if (!continueOnError) {
      return false;
    }

    if (maxFailures > 0 && execution.failureCount >= maxFailures) {
      return false;
    }

    return true;
  }

  public async runMixed(
    sequentialGroups: string[][],
    parallelGroups: string[][],
    execution: WorkflowExecution,
  ): Promise<void> {
    // Execute sequential groups first
    for (const group of sequentialGroups) {
      await this.runSequential(group, execution);
    }

    // Then execute parallel groups
    const parallelPromises = parallelGroups.map((group) =>
      this.runParallel(group, execution),
    );

    const results = await Promise.allSettled(parallelPromises);

    // Check for failures in parallel groups
    let hasFailures = false;
    for (const result of results) {
      if (result.status === "rejected") {
        hasFailures = true;
        break;
      }
    }

    if (hasFailures && !this.shouldContinueOnFailure(execution)) {
      throw new WorkflowExecutionException(
        execution.executionId,
        execution.workflowId,
        undefined,
        "Mixed execution failed in parallel groups",
      );
    }
  }
}
