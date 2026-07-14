import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class OutputParserStage implements IPipelineStage {
  public readonly name = "OutputParserStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Parsing execution result...`);

    const executionResult = payload.executionResult;

    if (!executionResult) {
      throw new Error("ExecutionResult missing.");
    }

    const parsedOutput = {
      success: executionResult.success,
      output: executionResult.output,
      error: executionResult.error,
      finishReason: executionResult.finishReason,
      tokens: executionResult.tokens,
      cost: executionResult.cost,
      latencyMs: executionResult.latencyMs,
      providerMetadata: executionResult.providerMetadata,
      toolCalls: executionResult.toolCalls,
    };

    return {
      ...payload,
      parsedOutput,
    };
  }
}
