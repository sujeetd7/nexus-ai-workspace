import { AgentMessage, MessageStatus } from "./agent-message";

export interface IAgentInbox<T = unknown> {
  push(message: AgentMessage<T>): Promise<void>;
  pop(): Promise<AgentMessage<T> | undefined>;
  peek(): Promise<AgentMessage<T> | undefined>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

export class AgentInbox<T = unknown> implements IAgentInbox<T> {
  private readonly messages: AgentMessage<T>[] = [];
  private readonly agentId: string;
  private readonly maxSize: number = 1000;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  public async push(message: AgentMessage<T>): Promise<void> {
    // Validate message is for this agent
    if (message.receiverAgentId && message.receiverAgentId !== this.agentId) {
      throw new Error(`Message not addressed to agent ${this.agentId}`);
    }

    // Check inbox size limit
    if (this.messages.length >= this.maxSize) {
      throw new Error(`Inbox full: maximum ${this.maxSize} messages`);
    }

    // Update message status
    const messageWithStatus: AgentMessage<T> = {
      ...message,
      status: MessageStatus.DELIVERED,
      metadata: {
        ...message.metadata,
        deliveredAt: new Date(),
        deliveredToAgent: this.agentId,
      },
    };

    // Insert message in priority order
    this.insertByPriority(messageWithStatus);
  }

  public async pop(): Promise<AgentMessage<T> | undefined> {
    const message = this.messages.shift();

    if (message) {
      // Update message status
      const processedMessage: AgentMessage<T> = {
        ...message,
        status: MessageStatus.PROCESSED,
        metadata: {
          ...message.metadata,
          processedAt: new Date(),
          processedByAgent: this.agentId,
        },
      };

      return processedMessage;
    }

    return undefined;
  }

  public async peek(): Promise<AgentMessage<T> | undefined> {
    return this.messages.length > 0 ? this.messages[0] : undefined;
  }

  public async size(): Promise<number> {
    return this.messages.length;
  }

  public async clear(): Promise<void> {
    this.messages.length = 0;
  }

  public async isEmpty(): Promise<boolean> {
    return this.messages.length === 0;
  }

  public async isFull(): Promise<boolean> {
    return this.messages.length >= this.maxSize;
  }

  public async getMessagesByPriority(
    priority: string,
  ): Promise<AgentMessage<T>[]> {
    return this.messages.filter((msg) => msg.priority === priority);
  }

  public async getMessagesByType(type: string): Promise<AgentMessage<T>[]> {
    return this.messages.filter((msg) => msg.type === type);
  }

  public async getMessagesBySender(
    senderAgentId: string,
  ): Promise<AgentMessage<T>[]> {
    return this.messages.filter((msg) => msg.senderAgentId === senderAgentId);
  }

  public getAgentId(): string {
    return this.agentId;
  }

  private insertByPriority(message: AgentMessage<T>): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const messagePriority = priorityOrder[message.priority] ?? 2;

    let insertIndex = 0;

    // Find correct position based on priority and timestamp
    for (let i = 0; i < this.messages.length; i++) {
      const existingPriority = priorityOrder[this.messages[i].priority] ?? 2;

      if (messagePriority < existingPriority) {
        insertIndex = i;
        break;
      } else if (messagePriority === existingPriority) {
        // Same priority, order by timestamp (older first)
        if (
          message.timestamp.getTime() < this.messages[i].timestamp.getTime()
        ) {
          insertIndex = i;
          break;
        }
      }
      insertIndex = i + 1;
    }

    this.messages.splice(insertIndex, 0, message);
  }
}
