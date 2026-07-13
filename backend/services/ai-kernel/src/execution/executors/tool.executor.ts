import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionStep } from "../interfaces/execution-step.interface";
import { IExecutor } from "../interfaces/executor.interface";

export class ToolExecutorAdapter implements IExecutor {
  constructor(
    private readonly toolExecutor: {
      execute(payload: any): Promise<any>;
    },
  ) {}

  public supports(type: string): boolean {
    return type === "tool";
  }

  public async execute(
    context: IKernelContext,
    step: ExecutionStep,
    payload: any,
  ): Promise<any> {
    console.log(`[ToolExecutor] Executing step: ${step.name}`);

    return this.toolExecutor.execute(payload);
  }
}
