import { IKernelContext, IMemory } from "../kernel/kernel-context.interface";
import { IKernel } from "../kernel/kernel.interface";
import { IMemoryModule } from "./memory-module.interface";
import { ChatIntegrationModule } from "../integrations/chat/chat-integration.module";

export class MemoryModule implements IMemoryModule {
  public readonly name = "MemoryModule";
  private kernel?: IKernel;

  public async init(kernel: IKernel): Promise<void> {
    this.kernel = kernel;
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

    if (!conversationId) {
      return [];
    }

    if (!this.kernel) {
      console.warn("Kernel not available in MemoryModule");
      return [];
    }

    try {
      const chatModule = this.kernel.getModule<ChatIntegrationModule>(
        "ChatIntegrationModule",
      );
      const client = chatModule.getClient();
      const messages = await client.listMessages(conversationId);

      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.map((message: any) => ({
        role: this.mapRole(message.role),
        content: message.content || "",
      }));
    } catch (error) {
      console.error("Error loading conversation history:", error);
      return [];
    }
  }

  private mapRole(role: string): "user" | "assistant" | "system" {
    switch (role?.toUpperCase()) {
      case "USER":
        return "user";
      case "ASSISTANT":
        return "assistant";
      default:
        return "system";
    }
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

    if (!context.conversationId) {
      console.warn("No conversationId provided for memory persistence");
      return;
    }

    if (!this.kernel) {
      console.warn("Kernel not available in MemoryModule for persistence");
      return;
    }

    try {
      const chatModule = this.kernel.getModule<ChatIntegrationModule>(
        "ChatIntegrationModule",
      );
      const client = chatModule.getClient();

      // Determine assistant response
      const assistantText = context.parsedOutput?.text || context.llmOutput;

      if (!assistantText) {
        console.log("No assistant response to persist");
        return;
      }

      await client.createMessage(context.conversationId, {
        type: "ASSISTANT",
        senderId: "AI_KERNEL",
        content: assistantText,
      });

      console.log("Assistant response persisted successfully");
    } catch (error) {
      console.error("Error persisting assistant response:", error);
    }
  }
}
