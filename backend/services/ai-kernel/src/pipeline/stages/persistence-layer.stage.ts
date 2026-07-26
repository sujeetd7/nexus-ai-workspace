import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";

import { IMemoryModule } from "../../memory/memory-module.interface";

import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class PersistenceLayerStage implements IPipelineStage {
  public readonly name = "PersistenceLayerStage";

  constructor(private readonly kernel: IKernel) {}

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Persisting execution...`);

    const memoryModule = this.kernel.getModule<IMemoryModule>("MemoryModule");

    // Persist memory (assistant message)
    await memoryModule.persistMemory(context, payload.memory);

    // Persist execution metadata
    if (payload.executionResult) {
      console.log(`[${this.name}] Persisting execution metadata...`);
      try {
        // Store usage statistics
        context.tokensUsed = payload.executionResult.tokens;
        context.latencyMs = payload.executionResult.latencyMs;
        context.finishReason = payload.executionResult.finishReason;
        
        // Store tool outputs if available
        if (payload.executionResult.providerMetadata?.toolCalls) {
          context.toolOutputs = payload.executionResult.providerMetadata.toolCalls;
        }
        
        console.log(`[${this.name}] Execution metadata persisted`);
      } catch (error) {
        console.error("Error persisting execution metadata:", error);
      }
    }

    console.log(`[${this.name}] Persistence completed.`);

    return payload;
  }
}
