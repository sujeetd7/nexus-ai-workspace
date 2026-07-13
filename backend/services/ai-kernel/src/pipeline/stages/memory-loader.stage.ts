import { IKernelContext, IMemory } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { IMemoryModule } from "../../memory/memory-module.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class MemoryLoaderStage implements IPipelineStage {
  public readonly name = "MemoryLoaderStage";
  private kernelRef: IKernel | undefined;

  constructor(kernel?: IKernel) {
    this.kernelRef = kernel;
  }

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(
      `[${this.name}] Loading memory for context:`,
      context.requestId,
    );

    if (!this.kernelRef) {
      throw new Error("Kernel reference not set for MemoryLoaderStage.");
    }

    const memoryModule =
      this.kernelRef.getModule<IMemoryModule>("MemoryModule");
    if (!memoryModule) {
      throw new Error("MemoryModule not found in Kernel.");
    }

    // Load various types of memory using the MemoryModule
    const loadedMemory: IMemory = await memoryModule.loadMemory(context);

    const request = context.request ?? payload.request;

    // Integrate retrieved documents from the request metadata.
    // This assumes documents have been retrieved upstream (e.g., by an RAG service)
    // and passed in the initial request's metadata.
    const retrievedDocuments =
      (request?.metadata?.retrievedDocuments as any[]) || [];

    const mergedDocuments = [
      ...context.retrievedDocuments,
      ...retrievedDocuments,
    ];

    console.log(
      `[${this.name}] Memory loaded. Conversation history length: ${loadedMemory.conversationHistory.length}, Short-term memory keys: ${Object.keys(loadedMemory.shortTermMemory).length}, Retrieved documents count: ${mergedDocuments.length}`,
    );

    return {
      ...payload,
      memory: loadedMemory,
      retrievedDocuments: mergedDocuments,
    };
  }
}
