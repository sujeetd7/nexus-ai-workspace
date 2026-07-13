import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IScheduler } from "./scheduler";

/**
 * A scheduler that executes steps sequentially. Each step will complete before the next one starts.
 */
export class SequentialScheduler implements IScheduler {
  public async schedule(
    context: ExecutionContext,
    stepExecutor: (stepContext: ExecutionContext) => Promise<ExecutionResult>,
  ): Promise<ExecutionResult[]> {
    console.log(
      `[SequentialScheduler] Scheduling steps for request: ${context.requestId}`,
    );
    const results: ExecutionResult[] = [];

    // For sequential execution, the 'plan' in the initial context represents the overall plan.
    // We assume a single 'step' for now, or that the planner provides a sequence of steps.
    // For the initial implementation, let's assume context.plan contains the details for one step.
    // In a multi-step scenario, context.plan.details might contain an array of steps.

    // For now, we'll treat the single plan as a single step for sequential execution.
    // This will be expanded when multi-step planning is fully integrated.
    const stepContext = new ExecutionContext(
      context.kernelContext,
      context.plan, // The plan for this 'step'
      context.payload,
      context.cancellationToken,
    );
    const result = await stepExecutor(stepContext);
    results.push(result);

    console.log(
      `[SequentialScheduler] Finished scheduling for request: ${context.requestId}`,
    );
    return results;
  }
}
