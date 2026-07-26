import { IAgentChannel, AgentChannel } from "./agent-channel";
import { IAgentBus, AgentBus } from "./agent-bus";
import { AgentMessage } from "./agent-message";

export interface CommunicationHealth {
  status: "healthy" | "degraded" | "unhealthy";
  channelCount: number;
  registeredAgents: number;
  totalMessages: number;
  errors: string[];
  warnings: string[];
  lastActivity: Date;
  uptime: number;
  metadata: Record<string, unknown>;
}

export interface ICommunicationManager<T = unknown> {
  createChannel(channelId: string): Promise<IAgentChannel<T>>;
  removeChannel(channelId: string): Promise<boolean>;
  listChannels(): Promise<string[]>;
  health(): Promise<CommunicationHealth>;
}

export class CommunicationManager<T = unknown> implements ICommunicationManager<T> {
  private readonly channels: Map<string, IAgentChannel<T>> = new Map();
  private readonly bus: IAgentBus<T>;
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private readonly startTime: Date;
  private messageCount: number = 0;

  constructor() {
    this.bus = new AgentBus<T>();
    this.startTime = new Date();
  }

  public async createChannel(channelId: string): Promise<IAgentChannel<T>> {
    if (this.channels.has(channelId)) {
      throw new Error(`Channel '${channelId}' already exists`);
    }

    try {
      const channel = new AgentChannel<T>(channelId);
      this.channels.set(channelId, channel);
      return channel;
    } catch (error) {
      const errorMsg = `Failed to create channel '${channelId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async removeChannel(channelId: string): Promise<boolean> {
    try {
      const channel = this.channels.get(channelId);
      if (!channel) {
        return false;
      }

      // Clear channel history
      await channel.clearHistory();
      
      // Remove channel
      return this.channels.delete(channelId);
    } catch (error) {
      const errorMsg = `Failed to remove channel '${channelId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async listChannels(): Promise<string[]> {
    return Array.from(this.channels.keys());
  }

  public async getChannel(channelId: string): Promise<IAgentChannel<T> | undefined> {
    return this.channels.get(channelId);
  }

  public async hasChannel(channelId: string): Promise<boolean> {
    return this.channels.has(channelId);
  }

  public async getChannelCount(): Promise<number> {
    return this.channels.size;
  }

  public getBus(): IAgentBus<T> {
    return this.bus;
  }

  public async registerAgent(agentId: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.bus.register(agentId, metadata);
    } catch (error) {
      const errorMsg = `Failed to register agent '${agentId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async unregisterAgent(agentId: string): Promise<boolean> {
    try {
      // Unsubscribe from all channels
      for (const channel of this.channels.values()) {
        await channel.unsubscribeAgent(agentId);
      }
      
      // Unregister from bus
      return await this.bus.unregister(agentId);
    } catch (error) {
      const errorMsg = `Failed to unregister agent '${agentId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async sendMessage(message: AgentMessage<T>): Promise<boolean> {
    try {
      this.messageCount++;
      return await this.bus.send(message);
    } catch (error) {
      const errorMsg = `Failed to send message '${message.messageId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async broadcastMessage(message: AgentMessage<T>): Promise<number> {
    try {
      this.messageCount++;
      return await this.bus.broadcast(message);
    } catch (error) {
      const errorMsg = `Failed to broadcast message '${message.messageId}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async health(): Promise<CommunicationHealth> {
    const now = new Date();
    const uptime = now.getTime() - this.startTime.getTime();
    
    let registeredAgents = 0;
    try {
      registeredAgents = await this.bus.getAgentCount();
    } catch (error) {
      this.warnings.push(`Failed to get agent count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    
    if (this.errors.length > 0) {
      status = "unhealthy";
    } else if (this.warnings.length > 0 || registeredAgents === 0) {
      status = "degraded";
    }

    return {
      status,
      channelCount: this.channels.size,
      registeredAgents,
      totalMessages: this.messageCount,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastActivity: now,
      uptime,
      metadata: {
        startTime: this.startTime,
        averageMessagesPerMinute: uptime > 0 ? (this.messageCount / (uptime / 60000)) : 0,
        channelsActive: this.channels.size,
        busStatus: "active"
      }
    };
  }

  public async clearErrors(): Promise<void> {
    this.errors.length = 0;
  }

  public async clearWarnings(): Promise<void> {
    this.warnings.length = 0;
  }

  public async getStats(): Promise<{
    channels: number;
    agents: number;
    messages: number;
    uptime: number;
    errors: number;
    warnings: number;
  }> {
    const registeredAgents = await this.bus.getAgentCount();
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      channels: this.channels.size,
      agents: registeredAgents,
      messages: this.messageCount,
      uptime,
      errors: this.errors.length,
      warnings: this.warnings.length
    };
  }

  public async shutdown(): Promise<void> {
    try {
      // Clear all channels
      for (const channelId of this.channels.keys()) {
        await this.removeChannel(channelId);
      }
      
      // Clear bus message log
      await this.bus.clearMessageLog();
      
      // Reset counters
      this.messageCount = 0;
      this.errors.length = 0;
      this.warnings.length = 0;
      
    } catch (error) {
      console.error("Error during communication manager shutdown:", error);
    }
  }
}