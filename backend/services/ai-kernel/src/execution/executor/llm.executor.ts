import { IKernel } from "../../kernel/kernel.interface";
import { IProviderModule } from "../../providers/provider-module.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

export class LLMExecutor implements IExecutionExecutor {
  constructor(private readonly kernel: IKernel) {}

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[LLMExecutor]");

    const started = Date.now();

    const providerModule =
      this.kernel.getModule<IProviderModule>("ProviderModule");

    const response = await providerModule.execute({
      provider: context.plan.provider,
      prompt: context.payload.compiledPrompt,
      model: context.plan.model,
      temperature: context.plan.temperature,
      stream: context.plan.stream,
      maxTokens: context.plan.maxTokens,
    });

    // Store for OutputExecutor
    context.payload.lastOutput = response.text;

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput(response.text)
      .setTokens(response.usage?.totalTokens ?? 0)
      .setLatencyMs(Date.now() - started)
      .setFinishReason(response.finishReason ?? "completed")
      .setProviderMetadata({
        provider: context.plan.provider,
        model: context.plan.model,
      })
      .build();
  }
}
