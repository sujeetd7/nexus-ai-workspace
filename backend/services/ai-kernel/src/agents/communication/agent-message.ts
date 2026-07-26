import { AgentPriority } from "../types";

export enum MessageType {
  REQUEST = "request",
  RESPONSE = "response",
  NOTIFICATION = "notification",
  BROADCAST = "broadcast",
  ERROR = "error"
}

export enum MessageStatus {
  PENDING = "pending",
  SENT = "sent",
  DELIVERED = "delivered",
  PROCESSED = "processed",
  FAILED = "failed"
}

export interface AgentMessage<T = unknown> {
  messageId: string;
  senderAgentId: string;
  receiverAgentId?: string; // Optional for broadcast messages
  conversationId?: string;
  workspaceId: string;
  requestId: string;
  traceId: string;
  timestamp: Date;
  priority: AgentPriority;
  type: MessageType;
  status: MessageStatus;
  payload: T;
  metadata: Record<string, unknown>;
}

export class AgentMessageBuilder<T = unknown> {
  private message: Partial<AgentMessage<T>> = {};

  public messageId(messageId: string): AgentMessageBuilder<T> {
    this.message.messageId = messageId;
    return this;
  }

  public senderAgentId(senderAgentId: string): AgentMessageBuilder<T> {
    this.message.senderAgentId = senderAgentId;
    return this;
  }

  public receiverAgentId(receiverAgentId: string): AgentMessageBuilder<T> {
    this.message.receiverAgentId = receiverAgentId;
    return this;
  }

  public conversationId(conversationId: string): AgentMessageBuilder<T> {
    this.message.conversationId = conversationId;
    return this;
  }

  public workspaceId(workspaceId: string): AgentMessageBuilder<T> {
    this.message.workspaceId = workspaceId;
    return this;
  }

  public requestId(requestId: string): AgentMessageBuilder<T> {
    this.message.requestId = requestId;
    return this;
  }

  public traceId(traceId: string): AgentMessageBuilder<T> {
    this.message.traceId = traceId;
    return this;
  }

  public timestamp(timestamp: Date): AgentMessageBuilder<T> {
    this.message.timestamp = timestamp;
    return this;
  }

  public priority(priority: AgentPriority): AgentMessageBuilder<T> {
    this.message.priority = priority;
    return this;
  }

  public type(type: MessageType): AgentMessageBuilder<T> {
    this.message.type = type;
    return this;
  }

  public status(status: MessageStatus): AgentMessageBuilder<T> {
    this.message.status = status;
    return this;
  }

  public payload(payload: T): AgentMessageBuilder<T> {
    this.message.payload = payload;
    return this;
  }

  public metadata(metadata: Record<string, unknown>): AgentMessageBuilder<T> {
    this.message.metadata = { ...this.message.metadata, ...metadata };
    return this;
  }

  public build(): AgentMessage<T> {
    const requiredFields = [
      'messageId', 'senderAgentId', 'workspaceId', 'requestId', 
      'traceId', 'timestamp', 'priority', 'type', 'status', 'payload'
    ];
    
    for (const field of requiredFields) {
      if (this.message[field as keyof AgentMessage<T>] === undefined) {
        throw new Error(`Message field '${field}' is required`);
      }
    }

    return {
      messageId: this.message.messageId!,
      senderAgentId: this.message.senderAgentId!,
      receiverAgentId: this.message.receiverAgentId,
      conversationId: this.message.conversationId,
      workspaceId: this.message.workspaceId!,
      requestId: this.message.requestId!,
      traceId: this.message.traceId!,
      timestamp: this.message.timestamp!,
      priority: this.message.priority!,
      type: this.message.type!,
      status: this.message.status!,
      payload: this.message.payload!,
      metadata: this.message.metadata || {}
    };
  }

  public static create<T = unknown>(): AgentMessageBuilder<T> {
    return new AgentMessageBuilder<T>();
  }
}