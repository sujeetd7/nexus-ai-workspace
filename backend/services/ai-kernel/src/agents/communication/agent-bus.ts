import { AgentMessage, MessageType, MessageStatus } from "./agent-message";
import { IAgentInbox, AgentInbox } from "./agent-inbox";
import { IAgentOutbox, AgentOutbox } from "./agent-outbox";

export interface RegisteredAgent<T = unknown> {
  agentId: string;
  inbox: IAgentInbox<T>;
  outbox: IAgentOutbox<T>;
  registeredAt: Date;
  lastActivity: Date;
  metadata: Record<string, unknown>;
}

export interface IAgentBus<T = unknown> {
  send(message: AgentMessage<T>): Promise<boolean>;
  broadcast(message: AgentMessage<T>): Promise<number>;
  register(agentId: string, metadata?: Record<string, unknown>): Promise<void>;
  unregister(agentId: string): Promise<boolean>;
  findAgent(agentId: string): Promise<RegisteredAgent<T> | undefined>;
  getAgentCount(): Promise<number>;
  clearMessageLog(): Promise<void>;
}

export class AgentBus<T = unknown> implements IAgentBus<T> {
  private readonly agents: Map<string, RegisteredAgent<T>> = new Map();
  private readonly messageLog: AgentMessage<T>[] = [];
  private readonly maxLogSize: number = 1000;

  public async send(message: AgentMessage<T>): Promise<boolean> {
    try {
      // Log the message
      this.addToMessageLog(message);

      // Validate sender is registered
      const sender = this.agents.get(message.senderAgentId);
      if (!sender) {
        throw new Error(
          `Sender agent '${message.senderAgentId}' not registered`,
        );
      }

      // Update sender's last activity
      sender.lastActivity = new Date();

      // Handle broadcast messages
      if (!message.receiverAgentId || message.type === MessageType.BROADCAST) {
        const deliveredCount = await this.broadcast(message);
        return deliveredCount > 0;
      }

      // Handle direct messages
      const receiver = this.agents.get(message.receiverAgentId);
      if (!receiver) {
        // Mark message as failed
        const failedMessage: AgentMessage<T> = {
          ...message,
          status: MessageStatus.FAILED,
          metadata: {
            ...message.metadata,
            error: `Receiver agent '${message.receiverAgentId}' not registered`,
            failedAt: new Date(),
          },
        };

        // Add to sender's outbox as failed
        await sender.outbox.markAsFailed(
          message.messageId,
          `Receiver not found: ${message.receiverAgentId}`,
        );
        return false;
      }

      // Deliver message to receiver's inbox
      await receiver.inbox.push(message);

      // Update receiver's last activity
      receiver.lastActivity = new Date();

      return true;
    } catch (error) {
      console.error(`Failed to send message ${message.messageId}:`, error);

      // Try to mark as failed in sender's outbox
      const sender = this.agents.get(message.senderAgentId);
      if (sender) {
        await sender.outbox.markAsFailed(
          message.messageId,
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      return false;
    }
  }

  public async broadcast(message: AgentMessage<T>): Promise<number> {
    let deliveredCount = 0;

    // Log the broadcast message
    this.addToMessageLog(message);

    // Validate sender is registered
    const sender = this.agents.get(message.senderAgentId);
    if (!sender) {
      throw new Error(`Sender agent '${message.senderAgentId}' not registered`);
    }

    // Update sender's last activity
    sender.lastActivity = new Date();

    // Create broadcast message
    const broadcastMessage: AgentMessage<T> = {
      ...message,
      type: MessageType.BROADCAST,
      receiverAgentId: undefined,
      metadata: {
        ...message.metadata,
        broadcast: true,
        broadcastAt: new Date(),
      },
    };

    // Deliver to all registered agents except sender
    const deliveryPromises = Array.from(this.agents.entries())
      .filter(([agentId]) => agentId !== message.senderAgentId)
      .map(async ([agentId, agent]) => {
        try {
          const messageForReceiver: AgentMessage<T> = {
            ...broadcastMessage,
            receiverAgentId: agentId,
          };

          await agent.inbox.push(messageForReceiver);
          agent.lastActivity = new Date();
          deliveredCount++;
        } catch (error) {
          console.error(
            `Failed to deliver broadcast message to agent ${agentId}:`,
            error,
          );
          // Continue delivery to other agents
        }
      });

    await Promise.allSettled(deliveryPromises);
    return deliveredCount;
  }

  public async register(
    agentId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent '${agentId}' is already registered`);
    }

    const inbox = new AgentInbox<T>(agentId);
    const outbox = new AgentOutbox<T>(agentId);

    const registeredAgent: RegisteredAgent<T> = {
      agentId,
      inbox,
      outbox,
      registeredAt: new Date(),
      lastActivity: new Date(),
      metadata,
    };

    this.agents.set(agentId, registeredAgent);
  }

  public async unregister(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Clear agent's inbox and outbox
    await agent.inbox.clear();
    await agent.outbox.clear();

    // Remove from registry
    return this.agents.delete(agentId);
  }

  public async findAgent(
    agentId: string,
  ): Promise<RegisteredAgent<T> | undefined> {
    return this.agents.get(agentId);
  }

  public async listAgents(): Promise<string[]> {
    return Array.from(this.agents.keys());
  }

  public async getRegisteredAgents(): Promise<RegisteredAgent<T>[]> {
    return Array.from(this.agents.values());
  }

  public async isRegistered(agentId: string): Promise<boolean> {
    return this.agents.has(agentId);
  }

  public async getAgentCount(): Promise<number> {
    return this.agents.size;
  }

  public async getMessageLog(limit?: number): Promise<AgentMessage<T>[]> {
    if (limit && limit > 0) {
      return this.messageLog.slice(-limit);
    }
    return [...this.messageLog];
  }

  public async clearMessageLog(): Promise<void> {
    this.messageLog.length = 0;
  }

  public async getAgentInbox(
    agentId: string,
  ): Promise<IAgentInbox<T> | undefined> {
    const agent = this.agents.get(agentId);
    return agent ? agent.inbox : undefined;
  }

  public async getAgentOutbox(
    agentId: string,
  ): Promise<IAgentOutbox<T> | undefined> {
    const agent = this.agents.get(agentId);
    return agent ? agent.outbox : undefined;
  }

  private addToMessageLog(message: AgentMessage<T>): void {
    this.messageLog.push(message);

    // Maintain log size limit
    if (this.messageLog.length > this.maxLogSize) {
      this.messageLog.shift();
    }
  }
}
