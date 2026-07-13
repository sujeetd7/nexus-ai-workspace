import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionStep } from "../interfaces/execution-step.interface";
import { IExecutor } from "../interfaces/executor.interface";

export class MemoryExecutor implements IExecutor {
  public supports(type: string): boolean {
    return type === "memory";
  }

  public async execute(
    context: IKernelContext,
    step: ExecutionStep,
    payload: any,
  ): Promise<any> {
    console.log(`[MemoryExecutor] Executing step: ${step.name}`);

    return payload;
  }
}
