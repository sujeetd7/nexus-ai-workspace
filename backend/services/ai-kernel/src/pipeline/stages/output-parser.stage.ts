import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class OutputParserStage implements IPipelineStage {
  public readonly name = "OutputParserStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Parsing LLM response...`);

    if (!payload.llmResponse) {
      throw new Error("LLM response missing.");
    }

    const parsedOutput = {
      text: payload.llmResponse.text,

      provider: payload.llmResponse.provider,

      model: payload.llmResponse.model,

      finishReason: payload.llmResponse.finishReason,

      usage: payload.llmResponse.usage,
    };

    return {
      ...payload,

      parsedOutput,
    };
  }
}
