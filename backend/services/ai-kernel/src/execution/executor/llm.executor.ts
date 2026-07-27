import { IKernel } from "../../kernel/kernel.interface";
import { IProviderModule } from "../../providers/provider-module.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";
import { ToolCallingExecutor } from "./tool-calling.executor";

export class LLMExecutor implements IExecutionExecutor {
  constructor(private readonly kernel: IKernel) {}

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[LLMExecutor]");

    const started = Date.now();

    // Check if tool calling is enabled and we have tools available
    const enableToolCalling = context.plan.enableToolCalling ?? false;

    if (enableToolCalling) {
      // Try to get the tool-calling executor and use it
      try {
        const executionModule = this.kernel.getModule("ExecutionModule") as any;
        if (executionModule) {
          const executorRegistry = executionModule.getExecutorRegistry();
          const toolCallingExecutor = executorRegistry.getExecutor(
            "tool_calling",
          ) as ToolCallingExecutor;

          if (toolCallingExecutor) {
            console.log("[LLMExecutor] Using tool-calling executor");
            return await toolCallingExecutor.execute(context);
          }
        }
      } catch (error) {
        console.warn(
          "[LLMExecutor] Tool calling not available, falling back to standard execution:",
          error,
        );
      }
    }

    // Standard LLM execution without tools
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

    const totalTokens =
      response.usage?.totalTokens ??
      (response as { totalTokens?: number }).totalTokens ??
      0;

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput(response.text)
      .setTokens(totalTokens)
      .setLatencyMs(Date.now() - started)
      .setFinishReason(response.finishReason ?? "completed")
      .setProviderMetadata({
        provider: context.plan.provider,
        model: context.plan.model,
      })
      .build();
  }
}
