import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionPlan } from "../../planner/types/execution-plan.interface";
import { IExecutorRegistry } from "../executor/executor-registry.interface";
import { ExecutionContext } from "./execution-context";
import { ExecutionResult } from "./execution-result";

export class ExecutionEngine {
  constructor(private readonly executorRegistry: IExecutorRegistry) {}

  public async executePlan(
    kernelContext: IKernelContext,
    plan: ExecutionPlan,
    payload: any,
    cancellationToken?: AbortSignal,
  ): Promise<ExecutionResult> {
    console.log(`[ExecutionEngine] Executing plan ${plan.id}`);

    const started = Date.now();

    payload.lastOutput ??= null;
    payload.toolResults ??= [];
    payload.executionMetadata ??= {};

    let totalTokens = 0;
    let totalCost = 0;
    const toolCalls: any[] = [];

    for (const step of plan.steps) {
      if (!step.enabled) {
        continue;
      }

      console.log(`[ExecutionEngine] Step -> ${step.type}`);

      const executor = this.executorRegistry.getExecutor(step.type);

      if (!executor) {
        throw new Error(`Executor '${step.type}' not registered.`);
      }

      const context = new ExecutionContext(
        kernelContext,
        plan,
        {
          ...payload,
          currentStep: step,
        },
        cancellationToken,
      );

      const result = await executor.execute(context);

      step.status = result.success ? "completed" : "failed";

      // Preserve latest executor output for downstream stages.
      if (result.output !== undefined) {
        payload.lastOutput = result.output;
      }

      // Preserve provider metadata.
      if (result.providerMetadata) {
        payload.executionMetadata = {
          ...payload.executionMetadata,
          ...result.providerMetadata,
        };
      }

      // Collect tool calls for observability.
      if (result.toolCalls?.length) {
        toolCalls.push(...result.toolCalls);
        payload.toolResults.push(...result.toolCalls);
      }

      totalTokens += result.tokens;
      totalCost += result.cost;

      if (!result.success) {
        return ExecutionResult.builder(kernelContext.requestId)
          .setSuccess(false)
          .setError(result.error)
          .setLatencyMs(Date.now() - started)
          .setTokens(totalTokens)
          .setCost(totalCost)
          .setToolCalls(toolCalls)
          .setProviderMetadata(payload.executionMetadata)
          .setFinishReason("step_failed")
          .build();
      }
    }

    return ExecutionResult.builder(kernelContext.requestId)
      .setSuccess(true)
      .setOutput(payload.lastOutput)
      .setTokens(totalTokens)
      .setCost(totalCost)
      .setToolCalls(toolCalls)
      .setProviderMetadata(payload.executionMetadata)
      .setLatencyMs(Date.now() - started)
      .setFinishReason("completed")
      .build();
  }
}
