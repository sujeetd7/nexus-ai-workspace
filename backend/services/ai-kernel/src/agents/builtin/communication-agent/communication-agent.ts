import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext,
} from "../../interfaces";
import {
  AgentType,
  AgentStatus,
  AgentPriority,
  AgentHealth,
  ExecutionResult,
  ExecutionStatus,
} from "../../types";
import {
  CommunicationOperation,
  CommunicationOperationRequest,
  SendMessageRequest,
  ReceiveMessageRequest,
  BroadcastMessageRequest,
  SubscribeChannelRequest,
  UnsubscribeChannelRequest,
  CommunicationOperationResult,
  SendMessageResult,
  ReceiveMessageResult,
  BroadcastMessageResult,
  SubscribeChannelResult,
  UnsubscribeChannelResult,
  MessageCreationOptions,
  CommunicationAgentHealth,
  CommunicationAgentMetrics,
} from "./communication-agent.types";
import {
  CommunicationAgentException,
  InvalidCommunicationOperationException,
  MessageSendException,
  MessageReceiveException,
  MessageBroadcastException,
  ChannelSubscriptionException,
  ChannelUnsubscriptionException,
  CommunicationManagerUnavailableException,
  AgentBusUnavailableException,
  InvalidMessageException,
  InvalidChannelException,
} from "./communication-agent.exceptions";
import { ICommunicationManager } from "../../communication/communication-manager";
import {
  AgentMessage,
  MessageType,
  MessageStatus,
  AgentMessageBuilder,
} from "../../communication/agent-message";

export interface CommunicationAgentComponents {
  communicationManager: ICommunicationManager;
}

export class CommunicationAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];

  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();

  // Communication components
  private readonly components: CommunicationAgentComponents;

  // Metrics
  private readonly operationCounts: Record<CommunicationOperation, number> =
    {} as Record<CommunicationOperation, number>;
  private readonly successCounts: Record<CommunicationOperation, number> =
    {} as Record<CommunicationOperation, number>;
  private readonly errorCounts: Record<CommunicationOperation, number> =
    {} as Record<CommunicationOperation, number>;
  private readonly latencies: Record<CommunicationOperation, number[]> =
    {} as Record<CommunicationOperation, number[]>;

  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  // Communication tracking
  private totalMessages = 0;
  private directMessages = 0;
  private broadcastMessages = 0;
  private failedMessages = 0;
  private totalSends = 0;
  private totalReceives = 0;
  private totalBroadcasts = 0;
  private totalSubscriptions = 0;
  private totalUnsubscriptions = 0;
  private broadcastRecipients = 0;
  private messagesByType: Record<MessageType, number> = {} as Record<
    MessageType,
    number
  >;
  private messagesByStatus: Record<MessageStatus, number> = {} as Record<
    MessageStatus,
    number
  >;
  private messagesByPriority: Record<AgentPriority, number> = {} as Record<
    AgentPriority,
    number
  >;
  private channelUsage: Record<
    string,
    { subscriptionCount: number; messageCount: number; lastActivity?: Date }
  > = {};

  constructor(components: CommunicationAgentComponents) {
    this.metadata = {
      id: "communication-agent",
      name: "Communication Agent",
      description:
        "Built-in agent for inter-agent communication operations using the existing CommunicationManager infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["communication", "builtin", "messaging"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capabilities = [
      {
        id: "message-delivery",
        name: "Message Delivery",
        description:
          "Send and receive direct messages between agents with delivery confirmation",
        inputSchema: { operation: "string", message: "object" },
        outputSchema: { success: "boolean", deliverySent: "boolean" },
        parameters: { timeout: 30000 },
        dependencies: [],
      },
      {
        id: "message-broadcasting",
        name: "Message Broadcasting",
        description:
          "Broadcast messages to multiple agents with recipient tracking",
        inputSchema: { operation: "string", message: "object" },
        outputSchema: { success: "boolean", recipientCount: "number" },
        parameters: { timeout: 60000 },
        dependencies: [],
      },
      {
        id: "channel-management",
        name: "Channel Management",
        description:
          "Subscribe and unsubscribe agents from communication channels",
        inputSchema: {
          operation: "string",
          agentId: "string",
          channelId: "string",
        },
        outputSchema: { success: "boolean", subscribed: "boolean" },
        parameters: {},
        dependencies: [],
      },
      {
        id: "message-reception",
        name: "Message Reception",
        description:
          "Receive messages from agent inboxes with filtering and timeout support",
        inputSchema: {
          operation: "string",
          agentId: "string",
          timeout: "number",
        },
        outputSchema: { success: "boolean", message: "object" },
        parameters: { defaultTimeout: 10000 },
        dependencies: [],
      },
    ];

    this.components = components;

    // Initialize metrics
    this.initializeMetrics();

    this.agentHealth = {
      status: "healthy",
      uptime: 0,
      lastHeartbeat: new Date(),
      memoryUsage: 0,
      cpuUsage: 0,
      errors: [],
      warnings: [],
      metrics: {},
    };
  }

  public get status(): AgentStatus {
    return this.agentStatus;
  }

  public get health(): AgentHealth {
    return this.agentHealth;
  }

  public async initialize(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.INITIALIZING;

      // Validate components
      if (!this.components.communicationManager) {
        throw new CommunicationManagerUnavailableException();
      }

      this.agentStatus = AgentStatus.IDLE;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize communication agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new CommunicationAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;

      // Cleanup resources if needed
      // Communication manager doesn't require special cleanup

      this.agentStatus = AgentStatus.STOPPED;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown communication agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new CommunicationAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.communicationManager) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      this.agentHealth = {
        status,
        uptime,
        lastHeartbeat: new Date(),
        memoryUsage: 0, // Placeholder
        cpuUsage: 0, // Placeholder
        errors: [...this.errors],
        warnings: [...this.warnings],
        metrics: {
          totalMessages: this.totalMessages,
          totalOperations: Object.values(this.operationCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
          successRate: this.calculateSuccessRate(),
        },
      };

      return this.agentHealth;
    } catch (error) {
      const errorMsg = `Failed to get communication agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        status: "unhealthy",
        uptime: Date.now() - this.startTime.getTime(),
        lastHeartbeat: new Date(),
        memoryUsage: 0,
        cpuUsage: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        metrics: { error: 1 },
      };
    }
  }

  public async updateStatus(status: AgentStatus): Promise<void> {
    this.agentStatus = status;
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.some((cap) => cap.id === capabilityId);
  }

  public getCapability(capabilityId: string): IAgentCapability | undefined {
    return this.capabilities.find((cap) => cap.id === capabilityId);
  }

  public listCapabilities(): IAgentCapability[] {
    return [...this.capabilities];
  }

  // Main execution method - determines which operation to execute based on input
  public async execute(
    input: unknown,
    context: IAgentExecutionContext,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.lastActivity = new Date();

    try {
      // Validate input
      const request = this.validateAndParseRequest(input);

      // Record operation attempt
      this.recordOperationAttempt(request.operation);

      // Execute operation
      let result: CommunicationOperationResult;

      switch (request.operation) {
        case CommunicationOperation.SEND:
          result = await this.sendMessage(
            request as SendMessageRequest,
            context,
          );
          break;
        case CommunicationOperation.RECEIVE:
          result = await this.receiveMessage(
            request as ReceiveMessageRequest,
            context,
          );
          break;
        case CommunicationOperation.BROADCAST:
          result = await this.broadcastMessage(
            request as BroadcastMessageRequest,
            context,
          );
          break;
        case CommunicationOperation.SUBSCRIBE:
          result = await this.subscribeToChannel(
            request as SubscribeChannelRequest,
            context,
          );
          break;
        case CommunicationOperation.UNSUBSCRIBE:
          result = await this.unsubscribeFromChannel(
            request as UnsubscribeChannelRequest,
            context,
          );
          break;
        default:
          throw new InvalidCommunicationOperationException(
            request.operation as string,
            "Unsupported operation",
          );
      }

      // Record success
      const duration = Date.now() - startTime;
      this.recordOperationSuccess(request.operation, duration);

      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: result.success,
        output: result,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: result.error ? [result.error] : [],
        status: result.success
          ? ExecutionStatus.COMPLETED
          : ExecutionStatus.FAILED,
        metadata: {
          operation: request.operation,
          ...result.metadata,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown execution error";

      // Record error
      if (input && typeof input === "object" && "operation" in input) {
        this.recordOperationError(
          input.operation as CommunicationOperation,
          duration,
        );
      }

      this.errors.push(errorMsg);

      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: false,
        output: undefined,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: [errorMsg],
        status: ExecutionStatus.FAILED,
        metadata: { error: errorMsg },
      };
    }
  }

  // Individual communication operations
  public async sendMessage(
    request: SendMessageRequest,
    context: IAgentExecutionContext,
  ): Promise<SendMessageResult> {
    const sentAt = new Date();

    try {
      // Validate message
      this.validateMessage(request.message);

      // Get the agent bus from communication manager
      const bus = (this.components.communicationManager as any).getBus();
      if (!bus) {
        throw new AgentBusUnavailableException();
      }

      // Send using existing bus
      const deliverySent = await bus.send(request.message);

      this.totalMessages++;
      this.totalSends++;
      this.directMessages++;

      // Track message statistics
      this.trackMessageStats(request.message);

      return {
        success: true,
        operation: CommunicationOperation.SEND,
        messageId: request.message.messageId,
        deliverySent,
        sentAt,
        metadata: {
          messageId: request.message.messageId,
          senderAgentId: request.message.senderAgentId,
          receiverAgentId: request.message.receiverAgentId,
          messageType: request.message.type,
          priority: request.message.priority,
          deliverySent,
          timestamp: sentAt,
        },
      };
    } catch (error) {
      this.failedMessages++;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown message send error";
      throw new MessageSendException(request.message.messageId, errorMsg);
    }
  }

  public async receiveMessage(
    request: ReceiveMessageRequest,
    context: IAgentExecutionContext,
  ): Promise<ReceiveMessageResult> {
    const receivedAt = new Date();

    try {
      // Get the agent bus from communication manager
      const bus = (this.components.communicationManager as any).getBus();
      if (!bus) {
        throw new AgentBusUnavailableException();
      }

      // Find the agent and get messages from inbox
      const registeredAgent = await bus.findAgent(request.agentId);
      if (!registeredAgent) {
        throw new MessageReceiveException(
          request.agentId,
          "Agent not registered",
        );
      }

      // Peek at inbox to get message count and optionally pop a message
      const messagesReceived = await registeredAgent.inbox.size();
      let message: AgentMessage | undefined;

      if (messagesReceived > 0) {
        message = await registeredAgent.inbox.pop();
        this.totalReceives++;

        if (message) {
          this.trackMessageStats(message);
        }
      }

      return {
        success: true,
        operation: CommunicationOperation.RECEIVE,
        agentId: request.agentId,
        message,
        messagesReceived,
        receivedAt,
        metadata: {
          agentId: request.agentId,
          messagesReceived,
          messageReceived: !!message,
          messageId: message?.messageId,
          messageType: message?.type,
          timestamp: receivedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown message receive error";
      throw new MessageReceiveException(request.agentId, errorMsg);
    }
  }

  public async broadcastMessage(
    request: BroadcastMessageRequest,
    context: IAgentExecutionContext,
  ): Promise<BroadcastMessageResult> {
    const broadcastAt = new Date();

    try {
      // Create broadcast message (without receiverAgentId)
      const broadcastMessage: AgentMessage = {
        ...request.message,
        type: MessageType.BROADCAST,
        status: MessageStatus.PENDING,
      };

      // Validate message
      this.validateMessage(broadcastMessage);

      // Get the agent bus from communication manager
      const bus = (this.components.communicationManager as any).getBus();
      if (!bus) {
        throw new AgentBusUnavailableException();
      }

      // Broadcast using existing bus
      const recipientCount = await bus.broadcast(broadcastMessage);

      this.totalMessages++;
      this.totalBroadcasts++;
      this.broadcastMessages++;
      this.broadcastRecipients += recipientCount;

      // Track message statistics
      this.trackMessageStats(broadcastMessage);

      return {
        success: true,
        operation: CommunicationOperation.BROADCAST,
        messageId: broadcastMessage.messageId,
        recipientCount,
        broadcastAt,
        metadata: {
          messageId: broadcastMessage.messageId,
          senderAgentId: broadcastMessage.senderAgentId,
          messageType: broadcastMessage.type,
          priority: broadcastMessage.priority,
          recipientCount,
          timestamp: broadcastAt,
        },
      };
    } catch (error) {
      this.failedMessages++;
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown message broadcast error";
      throw new MessageBroadcastException(request.message.messageId, errorMsg);
    }
  }

  public async subscribeToChannel(
    request: SubscribeChannelRequest,
    context: IAgentExecutionContext,
  ): Promise<SubscribeChannelResult> {
    const subscribedAt = new Date();

    try {
      // Validate channel ID
      if (!request.channelId || typeof request.channelId !== "string") {
        throw new InvalidChannelException(
          request.channelId,
          "Channel ID must be a non-empty string",
        );
      }

      // Create or get channel using existing manager
      const channel = await this.components.communicationManager.createChannel(
        request.channelId,
      );

      // Subscribe agent to channel with a default message handler
      const subscriptionId = await channel.subscribe(
        request.agentId,
        async (message) => {
          // Default handler - messages are automatically delivered to agent inbox by the bus
          // This is just for channel subscription tracking
        },
      );

      this.totalSubscriptions++;

      // Track channel usage
      if (!this.channelUsage[request.channelId]) {
        this.channelUsage[request.channelId] = {
          subscriptionCount: 0,
          messageCount: 0,
        };
      }
      this.channelUsage[request.channelId].subscriptionCount++;
      this.channelUsage[request.channelId].lastActivity = subscribedAt;

      return {
        success: true,
        operation: CommunicationOperation.SUBSCRIBE,
        agentId: request.agentId,
        channelId: request.channelId,
        subscribed: true,
        subscribedAt,
        metadata: {
          agentId: request.agentId,
          channelId: request.channelId,
          timestamp: subscribedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown channel subscription error";
      throw new ChannelSubscriptionException(
        request.agentId,
        request.channelId,
        errorMsg,
      );
    }
  }

  public async unsubscribeFromChannel(
    request: UnsubscribeChannelRequest,
    context: IAgentExecutionContext,
  ): Promise<UnsubscribeChannelResult> {
    const unsubscribedAt = new Date();

    try {
      // Validate channel ID
      if (!request.channelId || typeof request.channelId !== "string") {
        throw new InvalidChannelException(
          request.channelId,
          "Channel ID must be a non-empty string",
        );
      }

      // Get existing channels and find the one to unsubscribe from
      const channels =
        await this.components.communicationManager.listChannels();
      const channelExists = channels.includes(request.channelId);

      if (!channelExists) {
        throw new InvalidChannelException(
          request.channelId,
          "Channel does not exist",
        );
      }

      // Create channel reference to unsubscribe (this won't create a new one if it exists)
      const channel = await this.components.communicationManager.createChannel(
        request.channelId,
      );

      // Unsubscribe agent from channel using unsubscribeAgent method
      const unsubscribedCount = await channel.unsubscribeAgent(request.agentId);
      const unsubscribed = unsubscribedCount > 0;

      if (unsubscribed) {
        this.totalUnsubscriptions++;

        // Update channel usage
        if (this.channelUsage[request.channelId]) {
          this.channelUsage[request.channelId].subscriptionCount = Math.max(
            0,
            this.channelUsage[request.channelId].subscriptionCount - 1,
          );
          this.channelUsage[request.channelId].lastActivity = unsubscribedAt;
        }
      }

      return {
        success: true,
        operation: CommunicationOperation.UNSUBSCRIBE,
        agentId: request.agentId,
        channelId: request.channelId,
        unsubscribed,
        unsubscribedAt,
        metadata: {
          agentId: request.agentId,
          channelId: request.channelId,
          unsubscribed,
          timestamp: unsubscribedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown channel unsubscription error";
      throw new ChannelUnsubscriptionException(
        request.agentId,
        request.channelId,
        errorMsg,
      );
    }
  }

  public async getCommunicationAgentHealth(): Promise<CommunicationAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.communicationManager) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      // Get communication manager health for additional details
      let managerHealth;
      try {
        managerHealth = await this.components.communicationManager.health();
      } catch {
        managerHealth = null;
      }

      return {
        managerAvailable: !!this.components.communicationManager,
        busAvailable: !!(
          this.components.communicationManager as any
        ).getBus?.(),
        status,
        channelCount: managerHealth?.channelCount || 0,
        registeredAgents: managerHealth?.registeredAgents || 0,
        totalMessages: managerHealth?.totalMessages || this.totalMessages,
        activeChannels: Object.keys(this.channelUsage).length,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          totalSends: this.totalSends,
          totalReceives: this.totalReceives,
          totalBroadcasts: this.totalBroadcasts,
          totalSubscriptions: this.totalSubscriptions,
          totalUnsubscriptions: this.totalUnsubscriptions,
          directMessages: this.directMessages,
          broadcastMessages: this.broadcastMessages,
          failedMessages: this.failedMessages,
          channelUsage: { ...this.channelUsage },
        },
      };
    } catch (error) {
      const errorMsg = `Failed to get communication agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        managerAvailable: false,
        busAvailable: false,
        status: "unhealthy",
        channelCount: 0,
        registeredAgents: 0,
        totalMessages: 0,
        activeChannels: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg },
      };
    }
  }

  public getMetrics(): CommunicationAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const successRate =
      totalOperations > 0 ? totalSuccesses / totalOperations : 0;

    // Calculate average latencies
    const averageLatencies: Record<CommunicationOperation, number> =
      {} as Record<CommunicationOperation, number>;
    Object.keys(this.latencies).forEach((op) => {
      const operation = op as CommunicationOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;
    });

    // Calculate average message size (placeholder)
    const averageMessageSize = 0; // Would need to track actual message sizes

    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      messageStats: {
        totalMessages: this.totalMessages,
        directMessages: this.directMessages,
        broadcastMessages: this.broadcastMessages,
        failedMessages: this.failedMessages,
        averageMessageSize,
        messagesByType: { ...this.messagesByType },
        messagesByStatus: { ...this.messagesByStatus },
        messagesByPriority: { ...this.messagesByPriority },
      },
      communicationStats: {
        totalSends: this.totalSends,
        totalReceives: this.totalReceives,
        totalBroadcasts: this.totalBroadcasts,
        totalSubscriptions: this.totalSubscriptions,
        totalUnsubscriptions: this.totalUnsubscriptions,
        sendSuccessRate: this.calculateOperationSuccessRate(
          CommunicationOperation.SEND,
        ),
        broadcastSuccessRate: this.calculateOperationSuccessRate(
          CommunicationOperation.BROADCAST,
        ),
        averageRecipientsPerBroadcast:
          this.totalBroadcasts > 0
            ? this.broadcastRecipients / this.totalBroadcasts
            : 0,
        channelUsage: { ...this.channelUsage },
      },
    };
  }

  // Private helper methods
  private validateAndParseRequest(
    input: unknown,
  ): CommunicationOperationRequest {
    if (!input || typeof input !== "object") {
      throw new InvalidCommunicationOperationException(
        "unknown",
        "Input must be an object",
      );
    }

    const request = input as Record<string, unknown>;

    if (!request.operation || typeof request.operation !== "string") {
      throw new InvalidCommunicationOperationException(
        "unknown",
        "Operation is required and must be a string",
      );
    }

    if (
      !Object.values(CommunicationOperation).includes(
        request.operation as CommunicationOperation,
      )
    ) {
      throw new InvalidCommunicationOperationException(
        request.operation as string,
        "Unsupported operation",
      );
    }

    // Validate operation-specific requirements
    const operation = request.operation as CommunicationOperation;

    if (operation === CommunicationOperation.SEND) {
      if (!request.message || typeof request.message !== "object") {
        throw new InvalidCommunicationOperationException(
          operation,
          "Message is required for send operation",
        );
      }
    }

    if (operation === CommunicationOperation.RECEIVE) {
      if (!request.agentId || typeof request.agentId !== "string") {
        throw new InvalidCommunicationOperationException(
          operation,
          "Agent ID is required for receive operation",
        );
      }
    }

    if (operation === CommunicationOperation.BROADCAST) {
      if (!request.message || typeof request.message !== "object") {
        throw new InvalidCommunicationOperationException(
          operation,
          "Message is required for broadcast operation",
        );
      }
    }

    if (
      [
        CommunicationOperation.SUBSCRIBE,
        CommunicationOperation.UNSUBSCRIBE,
      ].includes(operation)
    ) {
      if (!request.agentId || typeof request.agentId !== "string") {
        throw new InvalidCommunicationOperationException(
          operation,
          "Agent ID is required for channel operations",
        );
      }
      if (!request.channelId || typeof request.channelId !== "string") {
        throw new InvalidCommunicationOperationException(
          operation,
          "Channel ID is required for channel operations",
        );
      }
    }

    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request,
    } as CommunicationOperationRequest;
  }

  private validateMessage(message: AgentMessage): void {
    const requiredFields = [
      "messageId",
      "senderAgentId",
      "workspaceId",
      "requestId",
      "traceId",
      "timestamp",
      "priority",
      "type",
      "status",
      "payload",
    ];
    const missingFields = requiredFields.filter(
      (field) =>
        !(field in message) ||
        message[field as keyof AgentMessage] === undefined,
    );

    if (missingFields.length > 0) {
      throw new InvalidMessageException(missingFields);
    }

    // Validate message ID format
    if (
      typeof message.messageId !== "string" ||
      message.messageId.length === 0
    ) {
      throw new InvalidMessageException([
        "messageId (must be non-empty string)",
      ]);
    }

    // Validate agent IDs
    if (
      typeof message.senderAgentId !== "string" ||
      message.senderAgentId.length === 0
    ) {
      throw new InvalidMessageException([
        "senderAgentId (must be non-empty string)",
      ]);
    }

    // Validate workspace and request IDs
    if (
      typeof message.workspaceId !== "string" ||
      message.workspaceId.length === 0
    ) {
      throw new InvalidMessageException([
        "workspaceId (must be non-empty string)",
      ]);
    }

    if (
      typeof message.requestId !== "string" ||
      message.requestId.length === 0
    ) {
      throw new InvalidMessageException([
        "requestId (must be non-empty string)",
      ]);
    }

    // Validate enums
    if (!Object.values(MessageType).includes(message.type)) {
      throw new InvalidMessageException(["type (invalid MessageType)"]);
    }

    if (!Object.values(MessageStatus).includes(message.status)) {
      throw new InvalidMessageException(["status (invalid MessageStatus)"]);
    }

    if (!Object.values(AgentPriority).includes(message.priority)) {
      throw new InvalidMessageException(["priority (invalid AgentPriority)"]);
    }
  }

  private trackMessageStats(message: AgentMessage): void {
    // Track by type
    this.messagesByType[message.type] =
      (this.messagesByType[message.type] || 0) + 1;

    // Track by status
    this.messagesByStatus[message.status] =
      (this.messagesByStatus[message.status] || 0) + 1;

    // Track by priority
    this.messagesByPriority[message.priority] =
      (this.messagesByPriority[message.priority] || 0) + 1;
  }

  private initializeMetrics(): void {
    Object.values(CommunicationOperation).forEach((operation) => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });

    // Initialize message tracking by type
    Object.values(MessageType).forEach((type) => {
      this.messagesByType[type] = 0;
    });

    // Initialize message tracking by status
    Object.values(MessageStatus).forEach((status) => {
      this.messagesByStatus[status] = 0;
    });

    // Initialize message tracking by priority
    Object.values(AgentPriority).forEach((priority) => {
      this.messagesByPriority[priority] = 0;
    });
  }

  private recordOperationAttempt(operation: CommunicationOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(
    operation: CommunicationOperation,
    duration: number,
  ): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(
    operation: CommunicationOperation,
    duration: number,
  ): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }

  private calculateOperationSuccessRate(
    operation: CommunicationOperation,
  ): number {
    const totalOps = this.operationCounts[operation];
    const successOps = this.successCounts[operation];
    return totalOps > 0 ? successOps / totalOps : 0;
  }
}
