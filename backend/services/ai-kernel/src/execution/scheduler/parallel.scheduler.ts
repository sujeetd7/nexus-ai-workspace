import { ExecutionPlan } from "../../planner/types/execution-plan.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IScheduler } from "./scheduler";

/**
 * A scheduler that executes steps in parallel using Promise.all.
 * Suitable for independent steps that do not have strict ordering dependencies.
 */
export class ParallelScheduler implements IScheduler {
  public async schedule(
    context: ExecutionContext,
    stepExecutor: (stepContext: ExecutionContext) => Promise<ExecutionResult>,
  ): Promise<ExecutionResult[]> {
    console.log(
      `[ParallelScheduler] Scheduling steps for request: ${context.requestId}`,
    );

    // For parallel execution, the 'plan' might contain multiple independent steps.
    // For the initial implementation, let's assume context.plan.details.parallelSteps
    // could contain an array of plans for each parallel step.

    // If no specific parallel steps are defined, we'll execute the main plan as a single parallel task.
    const parallelSteps: ExecutionPlan[] =
      context.plan.action === "multi_step" &&
      context.plan.details?.parallelSteps
        ? context.plan.details.parallelSteps
        : [context.plan]; // Treat the single plan as one parallel step

    const executionPromises = parallelSteps.map(async (stepPlan) => {
      const stepContext = new ExecutionContext(
        context.kernelContext,
        stepPlan, // The specific plan for this parallel step
        context.payload,
        context.cancellationToken,
      );
      return stepExecutor(stepContext);
    });

    const results = await Promise.all(executionPromises);

    console.log(
      `[ParallelScheduler] Finished scheduling for request: ${context.requestId}`,
    );
    return results;
  }
}
