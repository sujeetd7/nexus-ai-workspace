import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionPlan } from "../interfaces/execution-plan.interface";
import { ExecutionResult } from "../interfaces/execution-result.interface";
import { ExecutorRegistry } from "../registry/executor-registry";
import { ExecutionContext } from "./execution-context";

export class ExecutionEngine {
  constructor(private readonly registry: ExecutorRegistry) {}

  public async execute(
    kernelContext: IKernelContext,
    plan: ExecutionPlan,
    payload: any,
  ): Promise<ExecutionResult> {
    const execution = new ExecutionContext();

    execution.status = "running" as any;

    let current = payload;

    try {
      for (const step of plan.steps) {
        if (!step.enabled) {
          continue;
        }

        execution.currentStep = step.name;

        const executor = this.registry.get(step.type);

        if (!executor) {
          throw new Error(`Executor not found for ${step.type}`);
        }

        current = await executor.execute(kernelContext, step, current);

        execution.setOutput(step.id, current);
      }

      execution.complete();

      return {
        status: execution.status,
        output: current,
        latency: Date.now() - execution.startedAt,
        tokens: current.tokens ?? 0,
        cost: current.cost ?? 0,
      };
    } catch (error) {
      execution.fail();

      return {
        status: execution.status,
        output: null,
        latency: Date.now() - execution.startedAt,
        tokens: 0,
        cost: 0,
        error: error as Error,
      };
    }
  }
}
