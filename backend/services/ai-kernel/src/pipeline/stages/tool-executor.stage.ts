import { IPipelineStage } from "../pipeline.interface";
import { IKernelContext } from "../../kernel/kernel-context.interface";

export class ToolExecutorStage implements IPipelineStage {
  public readonly name = "ToolExecutorStage";

  public async execute(context: IKernelContext, payload: any): Promise<any> {
    console.log(
      `[${this.name}] Executing tools for context:`,
      context.requestId,
    );
    // This would check the plan for tool calls and execute them
    // For now, assuming no tool calls for simplicity
    const toolOutput = null;
    return { ...payload, toolOutput };
  }
}
