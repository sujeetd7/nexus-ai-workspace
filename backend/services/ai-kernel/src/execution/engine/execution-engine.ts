import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPlan } from "../../planner/planner-module.interface";
import { IScheduler } from "../scheduler/scheduler";
import { ExecutionContext } from "./execution-context";
import { ExecutionResult } from "./execution-result";

// Placeholder for ExecutorRegistry and specific executors
// These will be implemented in a future batch.
interface IExecutorRegistry {
  getExecutor(action: string): IExecutor | undefined;
}

interface IExecutor {
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * The core execution engine responsible for orchestrating the execution of an AI Kernel plan.
 * It uses a scheduler to manage step execution and delegates to appropriate executors.
 */
export class ExecutionEngine {
  private scheduler: IScheduler;
  private executorRegistry: IExecutorRegistry; // Dependency for future batches

  constructor(scheduler: IScheduler, executorRegistry: IExecutorRegistry) {
    this.scheduler = scheduler;
    this.executorRegistry = executorRegistry;
  }

  /**
   * Executes a given execution plan.
   * @param kernelContext The global kernel context for the execution.
   * @param plan The execution plan to follow.
   * @param payload The initial payload for the execution.
   * @param cancellationToken Optional cancellation token.
   * @returns A promise that resolves to an aggregated `ExecutionResult`.
   */
  public async executePlan(
    kernelContext: IKernelContext,
    plan: IPlan,
    payload: any,
    cancellationToken?: AbortSignal,
  ): Promise<ExecutionResult> {
    console.log(
      `[ExecutionEngine] Starting execution for request: ${kernelContext.requestId} with plan action: ${plan.action}`,
    );

    const executionResults: ExecutionResult[] = [];
    const overallStartTime = Date.now();

    try {
      // The stepExecutor function passed to the scheduler
      const stepExecutor = async (
        stepContext: ExecutionContext,
      ): Promise<ExecutionResult> => {
        // Here, we would dynamically get the executor based on stepContext.plan.action
        // For Batch 1, we'll simulate an execution.
        const executor = this.executorRegistry.getExecutor(
          stepContext.plan.action,
        );

        if (executor) {
          console.log(
            `[ExecutionEngine] Executing step with executor for action: ${stepContext.plan.action}`,
          );
          return await executor.execute(stepContext);
        } else {
          console.warn(
            `[ExecutionEngine] No executor found for action: ${stepContext.plan.action}. Simulating execution.`,
          );
          // Simulate a successful execution if no specific executor is found yet
          return ExecutionResult.builder(stepContext.requestId)
            .setSuccess(true)
            .setOutput(
              `Simulated output for action: ${stepContext.plan.action}`,
            )
            .setTokens(10)
            .setLatencyMs(50)
            .setFinishReason("simulated_success")
            .build();
        }
      };

      // Use the injected scheduler to execute the steps
      const resultsFromScheduler = await this.scheduler.schedule(
        new ExecutionContext(kernelContext, plan, payload, cancellationToken),
        stepExecutor,
      );
      executionResults.push(...resultsFromScheduler);
    } catch (error: any) {
      console.error(
        `[ExecutionEngine] Execution failed for request ${kernelContext.requestId}:`,
        error,
      );
      // Aggregate a single error result if the entire scheduling fails
      return ExecutionResult.builder(kernelContext.requestId)
        .setSuccess(false)
        .setError(error)
        .setLatencyMs(Date.now() - overallStartTime)
        .setFinishReason("execution_error")
        .build();
    }

    const overallLatency = Date.now() - overallStartTime;
    const aggregatedTokens = executionResults.reduce(
      (sum, res) => sum + res.tokens,
      0,
    );
    const aggregatedCost = executionResults.reduce(
      (sum, res) => sum + res.cost,
      0,
    );
    const aggregatedOutput = executionResults
      .map((res) => res.output)
      .filter(Boolean)
      .join("\n");
    const aggregatedToolCalls = executionResults.flatMap(
      (res) => res.toolCalls,
    );
    const hasErrors = executionResults.some((res) => !res.success);

    // For simplicity, aggregate into a single ExecutionResult.
    // In a multi-step scenario, you might return an array of results or a more complex aggregated object.
    const finalResult = ExecutionResult.builder(kernelContext.requestId)
      .setSuccess(!hasErrors)
      .setOutput(aggregatedOutput)
      .setTokens(aggregatedTokens)
      .setCost(aggregatedCost)
      .setLatencyMs(overallLatency)
      .setToolCalls(aggregatedToolCalls)
      .setFinishReason(
        hasErrors
          ? "partial_failure"
          : executionResults[executionResults.length - 1]?.finishReason ||
              "unknown",
      )
      .setError(
        hasErrors
          ? new Error("One or more steps failed during execution.")
          : null,
      )
      .build();

    console.log(
      `[ExecutionEngine] Finished execution for request: ${kernelContext.requestId}. Success: ${finalResult.success}`,
    );
    return finalResult;
  }
}
