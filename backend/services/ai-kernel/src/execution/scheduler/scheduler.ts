import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";

/**
 * Defines the contract for an execution scheduler.
 * Schedulers are responsible for orchestrating the execution of a series of steps
 * based on a given execution context and a function to execute individual steps.
 */
export interface IScheduler {
  /**
   * Executes a series of steps based on the provided execution context and step executor.
   * @param context The overall execution context for the scheduling operation.
   * @param stepExecutor A function that, given a specific step's context, executes that step and returns its result.
   * @returns A promise that resolves to an array of `ExecutionResult` for each executed step.
   */
  schedule(
    context: ExecutionContext,
    stepExecutor: (stepContext: ExecutionContext) => Promise<ExecutionResult>,
  ): Promise<ExecutionResult[]>;
}
