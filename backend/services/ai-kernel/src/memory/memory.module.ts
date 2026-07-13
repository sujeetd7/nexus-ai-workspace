import { IKernelContext, IMemory } from "../kernel/kernel-context.interface";
import { IKernel } from "../kernel/kernel.interface";
import { IMemoryModule } from "./memory-module.interface";

export class MemoryModule implements IMemoryModule {
  public readonly name = "MemoryModule";

  public async init(kernel: IKernel): Promise<void> {
    console.log("MemoryModule initialized.");
  }

  public async dispose(): Promise<void> {
    console.log("MemoryModule disposed.");
  }

  public async loadMemory(context: IKernelContext): Promise<IMemory> {
    console.log("Loading memory for:", context.requestId);

    const conversationHistory = await this.loadConversationHistory(
      context.conversationId ?? context.requestId,
    );

    const shortTermMemory = await this.loadShortTermMemory(context.requestId);

    const memory: IMemory = {
      conversationHistory,
      shortTermMemory,
      longTermMemory: {},
    };

    return memory;
  }

  public async loadConversationHistory(conversationId: string): Promise<
    {
      role: string;
      content: string;
    }[]
  > {
    console.log(`Loading conversation history: ${conversationId}`);

    if (conversationId === "test-conversation-000") {
      return [
        {
          role: "user",
          content: "What is the capital of France?",
        },
        {
          role: "assistant",
          content: "The capital of France is Paris.",
        },
      ];
    }

    return [];
  }

  public async loadShortTermMemory(
    contextId: string,
  ): Promise<Record<string, unknown>> {
    console.log(`Loading short-term memory: ${contextId}`);

    return {
      lastQueryTime: Date.now(),
      userPreference: "verbose",
      sessionVariables: {
        userRole: "admin",
      },
    };
  }

  public async persistMemory(
    context: IKernelContext,
    memory: IMemory,
  ): Promise<void> {
    console.log("Persisting memory:", context.requestId);

    console.log(memory);
  }
}
