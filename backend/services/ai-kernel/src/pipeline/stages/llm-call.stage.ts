import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { IProviderModule } from "../../providers/provider-module.interface";
import { IPipelineStage } from "../pipeline.interface";

export class LLMCallStage implements IPipelineStage {
  readonly name = "LLMCallStage";

  constructor(private readonly kernel: IKernel) {}

  async execute(context: IKernelContext, payload: any): Promise<any> {
    console.log("[LLMCallStage]");

    const providerModule =
      this.kernel.getModule<IProviderModule>("ProviderModule");

    const providerName = payload.providerConfig?.provider ?? "ollama";

    const provider = providerModule.getProvider(providerName);

    const response = await provider.execute({
      provider: payload.executionPlan.provider ?? "ollama",
      prompt: payload.compiledPrompt,

      model: payload.executionPlan.model,

      temperature: payload.executionPlan.temperature,

      stream: payload.executionPlan.stream,

      maxTokens: payload.executionPlan.maxTokens,
    });

    return {
      ...payload,

      llmResponse: {
        ...response,
        provider: providerName,
        model: payload.executionPlan.model,
      },
    };
  }
}
