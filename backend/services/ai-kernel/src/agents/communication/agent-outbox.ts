import { AgentMessage, MessageStatus } from "./agent-message";

export interface OutboxMessage<T = unknown> {
  message: AgentMessage<T>;
  attempts: number;
  maxAttempts: number;
  nextRetry?: Date;
  lastError?: string;
}

export interface IAgentOutbox<T = unknown> {
  enqueue(message: AgentMessage<T>): Promise<void>;
  dequeue(): Promise<AgentMessage<T> | undefined>;
  retry(messageId: string): Promise<boolean>;
  clear(): Promise<void>;
  markAsFailed(messageId: string, error: string): Promise<void>;
}

export class AgentOutbox<T = unknown> implements IAgentOutbox<T> {
  private readonly messages: OutboxMessage<T>[] = [];
  private readonly failedMessages: OutboxMessage<T>[] = [];
  private readonly agentId: string;
  private readonly maxSize: number = 1000;
  private readonly maxRetryAttempts: number = 3;
  private readonly retryDelay: number = 5000; // 5 seconds

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  public async enqueue(message: AgentMessage<T>): Promise<void> {
    // Validate message is from this agent
    if (message.senderAgentId !== this.agentId) {
      throw new Error(`Message not from agent ${this.agentId}`);
    }

    // Check outbox size limit
    if (this.messages.length >= this.maxSize) {
      throw new Error(`Outbox full: maximum ${this.maxSize} messages`);
    }

    const outboxMessage: OutboxMessage<T> = {
      message: {
        ...message,
        status: MessageStatus.PENDING,
      },
      attempts: 0,
      maxAttempts: this.maxRetryAttempts,
    };

    // Insert message in priority order
    this.insertByPriority(outboxMessage);
  }

  public async dequeue(): Promise<AgentMessage<T> | undefined> {
    const now = new Date();

    // Find next message that's ready to send (considering retry delays)
    const messageIndex = this.messages.findIndex(
      (msg) => !msg.nextRetry || msg.nextRetry <= now,
    );

    if (messageIndex === -1) {
      return undefined;
    }

    const outboxMessage = this.messages.splice(messageIndex, 1)[0];

    // Update message status and attempts
    outboxMessage.attempts++;
    const messageToSend: AgentMessage<T> = {
      ...outboxMessage.message,
      status: MessageStatus.SENT,
      metadata: {
        ...outboxMessage.message.metadata,
        sentAt: new Date(),
        attempt: outboxMessage.attempts,
        sentFromAgent: this.agentId,
      },
    };

    return messageToSend;
  }

  public async retry(messageId: string): Promise<boolean> {
    // Find message in failed messages
    const failedIndex = this.failedMessages.findIndex(
      (msg) => msg.message.messageId === messageId,
    );

    if (failedIndex === -1) {
      return false; // Message not found
    }

    const failedMessage = this.failedMessages.splice(failedIndex, 1)[0];

    // Check if we can retry
    if (failedMessage.attempts >= failedMessage.maxAttempts) {
      // Put back in failed messages
      this.failedMessages.push(failedMessage);
      return false;
    }

    // Reset for retry
    const retryMessage: OutboxMessage<T> = {
      ...failedMessage,
      nextRetry: new Date(
        Date.now() + this.retryDelay * failedMessage.attempts,
      ),
      message: {
        ...failedMessage.message,
        status: MessageStatus.PENDING,
        metadata: {
          ...failedMessage.message.metadata,
          retryScheduledAt: new Date(),
          retryAttempt: failedMessage.attempts + 1,
        },
      },
    };

    // Re-enqueue for retry
    this.insertByPriority(retryMessage);
    return true;
  }

  public async clear(): Promise<void> {
    this.messages.length = 0;
    this.failedMessages.length = 0;
  }

  public async markAsFailed(messageId: string, error: string): Promise<void> {
    const messageIndex = this.messages.findIndex(
      (msg) => msg.message.messageId === messageId,
    );

    if (messageIndex !== -1) {
      const failedMessage = this.messages.splice(messageIndex, 1)[0];
      failedMessage.lastError = error;
      failedMessage.message.status = MessageStatus.FAILED;
      failedMessage.message.metadata = {
        ...failedMessage.message.metadata,
        failedAt: new Date(),
        error,
      };

      this.failedMessages.push(failedMessage);
    }
  }

  public async size(): Promise<number> {
    return this.messages.length;
  }

  public async getFailedCount(): Promise<number> {
    return this.failedMessages.length;
  }

  public async getPendingMessages(): Promise<AgentMessage<T>[]> {
    return this.messages.map((msg) => msg.message);
  }

  public async getFailedMessages(): Promise<AgentMessage<T>[]> {
    return this.failedMessages.map((msg) => msg.message);
  }

  public async getMessagesByPriority(
    priority: string,
  ): Promise<AgentMessage<T>[]> {
    return this.messages
      .filter((msg) => msg.message.priority === priority)
      .map((msg) => msg.message);
  }

  public getAgentId(): string {
    return this.agentId;
  }

  private insertByPriority(outboxMessage: OutboxMessage<T>): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const messagePriority = priorityOrder[outboxMessage.message.priority] ?? 2;

    let insertIndex = 0;

    // Find correct position based on priority and timestamp
    for (let i = 0; i < this.messages.length; i++) {
      const existingPriority =
        priorityOrder[this.messages[i].message.priority] ?? 2;

      if (messagePriority < existingPriority) {
        insertIndex = i;
        break;
      } else if (messagePriority === existingPriority) {
        // Same priority, order by timestamp (older first)
        if (
          outboxMessage.message.timestamp.getTime() <
          this.messages[i].message.timestamp.getTime()
        ) {
          insertIndex = i;
          break;
        }
      }
      insertIndex = i + 1;
    }

    this.messages.splice(insertIndex, 0, outboxMessage);
  }
}
