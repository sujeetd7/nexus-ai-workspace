import { AgentMessage, MessageType, MessageStatus } from "../../communication/agent-message";
import { AgentPriority } from "../../types";

export enum CommunicationOperation {
  SEND = "send",
  RECEIVE = "receive",
  BROADCAST = "broadcast",
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe"
}

export interface CommunicationOperationRequest {
  operation: CommunicationOperation;
  metadata?: Record<string, unknown>;
}

export interface SendMessageRequest extends CommunicationOperationRequest {
  operation: CommunicationOperation.SEND;
  message: AgentMessage;
}

export interface ReceiveMessageRequest extends CommunicationOperationRequest {
  operation: CommunicationOperation.RECEIVE;
  agentId: string;
  timeout?: number;
}

export interface BroadcastMessageRequest extends CommunicationOperationRequest {
  operation: CommunicationOperation.BROADCAST;
  message: Omit<AgentMessage, 'receiverAgentId'>;
}

export interface SubscribeChannelRequest extends CommunicationOperationRequest {
  operation: CommunicationOperation.SUBSCRIBE;
  agentId: string;
  channelId: string;
}

export interface UnsubscribeChannelRequest extends CommunicationOperationRequest {
  operation: CommunicationOperation.UNSUBSCRIBE;
  agentId: string;
  channelId: string;
}

export interface CommunicationOperationResult {
  success: boolean;
  operation: CommunicationOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface SendMessageResult extends CommunicationOperationResult {
  operation: CommunicationOperation.SEND;
  messageId: string;
  deliverySent: boolean;
  sentAt: Date;
}

export interface ReceiveMessageResult extends CommunicationOperationResult {
  operation: CommunicationOperation.RECEIVE;
  agentId: string;
  message?: AgentMessage;
  messagesReceived: number;
  receivedAt: Date;
}

export interface BroadcastMessageResult extends CommunicationOperationResult {
  operation: CommunicationOperation.BROADCAST;
  messageId: string;
  recipientCount: number;
  broadcastAt: Date;
}

export interface SubscribeChannelResult extends CommunicationOperationResult {
  operation: CommunicationOperation.SUBSCRIBE;
  agentId: string;
  channelId: string;
  subscribed: boolean;
  subscribedAt: Date;
}

export interface UnsubscribeChannelResult extends CommunicationOperationResult {
  operation: CommunicationOperation.UNSUBSCRIBE;
  agentId: string;
  channelId: string;
  unsubscribed: boolean;
  unsubscribedAt: Date;
}

export interface MessageCreationOptions {
  senderAgentId: string;
  receiverAgentId?: string;
  conversationId?: string;
  workspaceId: string;
  requestId: string;
  traceId: string;
  priority?: AgentPriority;
  type?: MessageType;
  payload: unknown;
  metadata?: Record<string, unknown>;
}

export interface CommunicationAgentHealth {
  managerAvailable: boolean;
  busAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  channelCount: number;
  registeredAgents: number;
  totalMessages: number;
  activeChannels: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface CommunicationAgentMetrics {
  operationCounts: Record<CommunicationOperation, number>;
  successCounts: Record<CommunicationOperation, number>;
  errorCounts: Record<CommunicationOperation, number>;
  averageLatencies: Record<CommunicationOperation, number>;
  
  totalOperations: number;
  successRate: number;
  uptime: number;
  
  messageStats: {
    totalMessages: number;
    directMessages: number;
    broadcastMessages: number;
    failedMessages: number;
    averageMessageSize: number;
    messagesByType: Record<MessageType, number>;
    messagesByStatus: Record<MessageStatus, number>;
    messagesByPriority: Record<AgentPriority, number>;
  };
  
  communicationStats: {
    totalSends: number;
    totalReceives: number;
    totalBroadcasts: number;
    totalSubscriptions: number;
    totalUnsubscriptions: number;
    sendSuccessRate: number;
    broadcastSuccessRate: number;
    averageRecipientsPerBroadcast: number;
    channelUsage: Record<string, {
      subscriptionCount: number;
      messageCount: number;
      lastActivity?: Date;
    }>;
  };
}