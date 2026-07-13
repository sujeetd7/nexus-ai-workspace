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

    await memoryModule.persistMemory(context, payload.memory);

    console.log(`[${this.name}] Persistence completed.`);

    return payload;
  }
}
