import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionStep } from "./execution-step.interface";

export interface IExecutor {
  supports(type: string): boolean;

  execute(
    context: IKernelContext,

    step: ExecutionStep,

    payload: any,
  ): Promise<any>;
}
