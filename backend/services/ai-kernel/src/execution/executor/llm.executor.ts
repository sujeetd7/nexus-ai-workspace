import { IKernel } from "../../kernel/kernel.interface";
import { IProviderModule } from "../../providers/provider-module.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutor } from "./executor-registry.interface";

/**
 * An executor responsible for making LLM calls based on the execution plan.
 */
export class LLMExecutor implements IExecutor {
  private kernel: IKernel;

  constructor(kernel: IKernel) {
    this.kernel = kernel;
  }

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log(
      `[LLMExecutor] Executing LLM call for request: ${context.requestId}`,
    );
    const startTime = Date.now();

    const providerModule =
      this.kernel.getModule<IProviderModule>("ProviderModule");
    if (!providerModule) {
      throw new Error("ProviderModule not found in Kernel.");
    }

    const plan = context.plan as {
      providerName?: string;
      modelName?: string;
      compiledPromptSegment?: string;
    };
    const { providerName, modelName, compiledPromptSegment } = plan;

    if (!providerName || !modelName || !compiledPromptSegment) {
      throw new Error(
        "LLMExecutor: Missing providerName, modelName, or compiledPromptSegment in plan.",
      );
    }

    const llmClient = providerModule.getProvider(providerName);
    if (!llmClient) {
      throw new Error(`LLM Client for provider ${providerName} not found.`);
    }

    console.log(
      `[LLMExecutor] Using LLM client: ${providerName}, model: ${modelName}`,
    );

    try {
      // Simulate LLM call
      const llmOutput = `LLM response to: '${compiledPromptSegment}' from ${modelName} via ${providerName}.`;
      const tokensUsed =
        compiledPromptSegment.length / 4 + llmOutput.length / 4; // Estimate
      const latencyMs = Date.now() - startTime; // Simulate latency
      const finishReason = "stop"; // Simulated

      // In a real scenario, this would involve actual LLM client calls and parsing its specific response.
      // Example: const response = await llmClient.chat.completions.create({ model: modelName, messages: [{ role: 'user', content: compiledPromptSegment }] });

      return ExecutionResult.builder(context.requestId)
        .setSuccess(true)
        .setOutput(llmOutput)
        .setTokens(Math.round(tokensUsed))
        .setLatencyMs(latencyMs)
        .setFinishReason(finishReason)
        .setProviderMetadata({ provider: providerName, model: modelName }) // Example metadata
        .build();
    } catch (error: any) {
      console.error(
        `[LLMExecutor] Error during LLM call for request ${context.requestId}:`,
        error,
      );
      return ExecutionResult.builder(context.requestId)
        .setSuccess(false)
        .setError(error)
        .setLatencyMs(Date.now() - startTime)
        .setFinishReason("error")
        .build();
    }
  }
}
