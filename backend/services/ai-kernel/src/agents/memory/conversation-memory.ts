import { BaseAgentMemory } from "./agent-memory";
import { MemoryContext } from "./memory-context";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface IConversationMemory {
  append(message: ConversationMessage, context: MemoryContext): Promise<void>;
  history(
    context: MemoryContext,
    limit?: number,
  ): Promise<ConversationMessage[]>;
  last(context: MemoryContext, count?: number): Promise<ConversationMessage[]>;
  clear(context: MemoryContext): Promise<void>;
}

export class ConversationMemory
  extends BaseAgentMemory<ConversationMessage[]>
  implements IConversationMemory
{
  private readonly maxHistorySize: number = 1000;

  public async append(
    message: ConversationMessage,
    context: MemoryContext,
  ): Promise<void> {
    try {
      const conversationKey = this.getConversationKey(context);
      let messages = (await this.load(conversationKey, context)) || [];

      // Add new message
      messages.push(message);

      // Enforce max history size
      if (messages.length > this.maxHistorySize) {
        messages = messages.slice(-this.maxHistorySize);
        this.warnings.push(
          `Conversation history truncated to ${this.maxHistorySize} messages`,
        );
      }

      await this.save(conversationKey, messages, context);
    } catch (error) {
      const errorMsg = `Failed to append conversation message: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async history(
    context: MemoryContext,
    limit?: number,
  ): Promise<ConversationMessage[]> {
    try {
      const conversationKey = this.getConversationKey(context);
      const messages = (await this.load(conversationKey, context)) || [];

      if (limit && limit > 0) {
        return messages.slice(-limit);
      }

      return messages;
    } catch (error) {
      const errorMsg = `Failed to get conversation history: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async last(
    context: MemoryContext,
    count: number = 1,
  ): Promise<ConversationMessage[]> {
    try {
      const conversationKey = this.getConversationKey(context);
      const messages = (await this.load(conversationKey, context)) || [];

      return messages.slice(-count);
    } catch (error) {
      const errorMsg = `Failed to get last conversation messages: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async clear(context: MemoryContext): Promise<void> {
    try {
      const conversationKey = this.getConversationKey(context);
      await this.save(conversationKey, [], context);
    } catch (error) {
      const errorMsg = `Failed to clear conversation memory: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async getMessageById(
    messageId: string,
    context: MemoryContext,
  ): Promise<ConversationMessage | undefined> {
    try {
      const messages = await this.history(context);
      return messages.find((msg) => msg.id === messageId);
    } catch (error) {
      const errorMsg = `Failed to get message by ID '${messageId}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async getMessagesByRole(
    role: ConversationMessage["role"],
    context: MemoryContext,
  ): Promise<ConversationMessage[]> {
    try {
      const messages = await this.history(context);
      return messages.filter((msg) => msg.role === role);
    } catch (error) {
      const errorMsg = `Failed to get messages by role '${role}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async size(context: MemoryContext): Promise<number> {
    try {
      const conversationKey = this.getConversationKey(context);
      const messages = (await this.load(conversationKey, context)) || [];
      return messages.length;
    } catch (error) {
      const errorMsg = `Failed to get conversation size: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  protected buildKeyPrefix(context: MemoryContext): string {
    return `conversation:${context.conversationId || context.requestId}`;
  }

  private getConversationKey(context: MemoryContext): string {
    return "messages";
  }
}
