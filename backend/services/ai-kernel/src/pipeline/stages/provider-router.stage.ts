import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class ProviderRouterStage implements IPipelineStage {
  public readonly name = "ProviderRouterStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Resolving provider configuration...`);

    if (!payload.executionPlan) {
      throw new Error("ExecutionPlan not found.");
    }

    const providerConfig = {
      provider: payload.executionPlan.provider,

      model: payload.executionPlan.model,

      temperature: payload.executionPlan.temperature,

      stream: payload.executionPlan.stream,

      maxTokens: payload.executionPlan.maxTokens,
    };

    return {
      ...payload,

      providerConfig,
    };
  }
}
