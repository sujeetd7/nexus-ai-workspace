import { IKernelContext } from "../../kernel/kernel-context.interface";
import { ExecutionStep } from "../interfaces/execution-step.interface";
import { IExecutor } from "../interfaces/executor.interface";

export class LLMExecutor implements IExecutor {
  constructor(
    private readonly provider: {
      execute(payload: any): Promise<any>;
    },
  ) {}

  public supports(type: string): boolean {
    return type === "llm";
  }

  public async execute(
    context: IKernelContext,
    step: ExecutionStep,
    payload: any,
  ): Promise<any> {
    console.log(`[LLMExecutor] Executing step: ${step.name}`);

    return this.provider.execute(payload);
  }
}
