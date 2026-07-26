import { ExecutionModule } from "../../execution/execution.module";
import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class ExecutionEngineStage implements IPipelineStage {
  public readonly name = "ExecutionEngineStage";

  constructor(private readonly kernel: IKernel) {}

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Executing plan...`);

    const executionModule =
      this.kernel.getModule<ExecutionModule>("ExecutionModule");

    if (!executionModule) {
      throw new Error("ExecutionModule not found.");
    }

    const executionEngine = executionModule.getExecutionEngine();
    if (!payload.executionPlan) {
      throw new Error("Execution plan not found.");
    }

    const executionResult = await executionEngine.executePlan(
      context,
      payload.executionPlan,
      {
        compiledPrompt: payload.compiledPrompt,
        request: payload.request,
        memory: payload.memory,
        retrievedDocuments: payload.retrievedDocuments,
        toolOutput: payload.toolOutput,
      },
    );

    return {
      ...payload,
      executionResult,
    };
  }
}
