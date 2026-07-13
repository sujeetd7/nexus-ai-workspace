import { IKernelContext, IMemory } from "../kernel/kernel-context.interface";
import { IKernelModule } from "../kernel/kernel-module.interface";

export interface IMemoryModule extends IKernelModule {
  loadMemory(context: IKernelContext): Promise<IMemory>;

  loadConversationHistory(conversationId: string): Promise<
    {
      role: string;
      content: string;
    }[]
  >;

  loadShortTermMemory(contextId: string): Promise<Record<string, unknown>>;

  persistMemory(context: IKernelContext, memory: IMemory): Promise<void>;
}
