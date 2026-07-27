import { AgentMessage } from "./agent-message";

export type MessageHandler<T = unknown> = (
  message: AgentMessage<T>,
) => Promise<void> | void;

export interface ChannelSubscription<T = unknown> {
  id: string;
  agentId: string;
  handler: MessageHandler<T>;
  filter?: (message: AgentMessage<T>) => boolean;
  createdAt: Date;
}

export interface IAgentChannel<T = unknown> {
  publish(message: AgentMessage<T>): Promise<void>;
  subscribe(
    agentId: string,
    handler: MessageHandler<T>,
    filter?: (message: AgentMessage<T>) => boolean,
  ): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<boolean>;
  broadcast(message: AgentMessage<T>): Promise<void>;
  clearHistory(): Promise<void>;
  unsubscribeAgent(agentId: string): Promise<number>;
}

export class AgentChannel<T = unknown> implements IAgentChannel<T> {
  private readonly channelId: string;
  private readonly subscriptions: Map<string, ChannelSubscription<T>> =
    new Map();
  private readonly messageHistory: AgentMessage<T>[] = [];
  private readonly maxHistorySize: number = 100;

  constructor(channelId: string) {
    this.channelId = channelId;
  }

  public async publish(message: AgentMessage<T>): Promise<void> {
    // Add to message history
    this.addToHistory(message);

    // Find relevant subscriptions
    const relevantSubscriptions = Array.from(
      this.subscriptions.values(),
    ).filter((sub) => {
      // Apply filter if provided
      if (sub.filter && !sub.filter(message)) {
        return false;
      }

      // If message has specific receiver, only send to that agent
      if (message.receiverAgentId) {
        return sub.agentId === message.receiverAgentId;
      }

      // Otherwise, send to all subscribed agents except sender
      return sub.agentId !== message.senderAgentId;
    });

    // Deliver to subscribers
    const deliveryPromises = relevantSubscriptions.map(async (subscription) => {
      try {
        await subscription.handler(message);
      } catch (error) {
        console.error(
          `Failed to deliver message to agent ${subscription.agentId}:`,
          error,
        );
        // Continue delivery to other subscribers even if one fails
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  public async subscribe(
    agentId: string,
    handler: MessageHandler<T>,
    filter?: (message: AgentMessage<T>) => boolean,
  ): Promise<string> {
    const subscriptionId = `${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const subscription: ChannelSubscription<T> = {
      id: subscriptionId,
      agentId,
      handler,
      filter,
      createdAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, subscription);
    return subscriptionId;
  }

  public async unsubscribe(subscriptionId: string): Promise<boolean> {
    return this.subscriptions.delete(subscriptionId);
  }

  public async broadcast(message: AgentMessage<T>): Promise<void> {
    // Ensure message is marked as broadcast
    const broadcastMessage: AgentMessage<T> = {
      ...message,
      receiverAgentId: undefined, // Clear specific receiver for broadcast
      metadata: {
        ...message.metadata,
        broadcast: true,
        broadcastAt: new Date(),
      },
    };

    await this.publish(broadcastMessage);
  }

  public getChannelId(): string {
    return this.channelId;
  }

  public async getSubscriberCount(): Promise<number> {
    return this.subscriptions.size;
  }

  public async getSubscribers(): Promise<string[]> {
    return Array.from(
      new Set(
        Array.from(this.subscriptions.values()).map((sub) => sub.agentId),
      ),
    );
  }

  public async getSubscriptionsByAgent(
    agentId: string,
  ): Promise<ChannelSubscription<T>[]> {
    return Array.from(this.subscriptions.values()).filter(
      (sub) => sub.agentId === agentId,
    );
  }

  public async getMessageHistory(limit?: number): Promise<AgentMessage<T>[]> {
    if (limit && limit > 0) {
      return this.messageHistory.slice(-limit);
    }
    return [...this.messageHistory];
  }

  public async clearHistory(): Promise<void> {
    this.messageHistory.length = 0;
  }

  public async isSubscribed(agentId: string): Promise<boolean> {
    return Array.from(this.subscriptions.values()).some(
      (sub) => sub.agentId === agentId,
    );
  }

  public async unsubscribeAgent(agentId: string): Promise<number> {
    const subscriptionsToRemove = Array.from(this.subscriptions.entries())
      .filter(([, sub]) => sub.agentId === agentId)
      .map(([id]) => id);

    for (const id of subscriptionsToRemove) {
      this.subscriptions.delete(id);
    }

    return subscriptionsToRemove.length;
  }

  private addToHistory(message: AgentMessage<T>): void {
    this.messageHistory.push(message);

    // Maintain history size limit
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }
}
