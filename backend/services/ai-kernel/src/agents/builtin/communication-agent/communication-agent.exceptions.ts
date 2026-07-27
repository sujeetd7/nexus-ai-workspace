export class CommunicationAgentException extends Error {
  public readonly name = "CommunicationAgentException";
  public readonly operation?: string;

  constructor(operation?: string, message?: string) {
    super(
      message ||
        `Communication agent operation${operation ? ` '${operation}'` : ""} failed`,
    );
    this.operation = operation;
    Object.setPrototypeOf(this, CommunicationAgentException.prototype);
  }
}

export class InvalidCommunicationOperationException extends Error {
  public readonly name = "InvalidCommunicationOperationException";
  public readonly operation: string;
  public readonly reason: string;

  constructor(operation: string, reason: string, message?: string) {
    super(
      message || `Invalid communication operation '${operation}': ${reason}`,
    );
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(
      this,
      InvalidCommunicationOperationException.prototype,
    );
  }
}

export class MessageSendException extends Error {
  public readonly name = "MessageSendException";
  public readonly messageId: string;
  public readonly reason: string;

  constructor(messageId: string, reason: string, message?: string) {
    super(message || `Message send failed for '${messageId}': ${reason}`);
    this.messageId = messageId;
    this.reason = reason;
    Object.setPrototypeOf(this, MessageSendException.prototype);
  }
}

export class MessageReceiveException extends Error {
  public readonly name = "MessageReceiveException";
  public readonly agentId: string;
  public readonly reason: string;

  constructor(agentId: string, reason: string, message?: string) {
    super(
      message || `Message receive failed for agent '${agentId}': ${reason}`,
    );
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, MessageReceiveException.prototype);
  }
}

export class MessageBroadcastException extends Error {
  public readonly name = "MessageBroadcastException";
  public readonly messageId: string;
  public readonly reason: string;

  constructor(messageId: string, reason: string, message?: string) {
    super(message || `Message broadcast failed for '${messageId}': ${reason}`);
    this.messageId = messageId;
    this.reason = reason;
    Object.setPrototypeOf(this, MessageBroadcastException.prototype);
  }
}

export class ChannelSubscriptionException extends Error {
  public readonly name = "ChannelSubscriptionException";
  public readonly agentId: string;
  public readonly channelId: string;
  public readonly reason: string;

  constructor(
    agentId: string,
    channelId: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Channel subscription failed for agent '${agentId}' to channel '${channelId}': ${reason}`,
    );
    this.agentId = agentId;
    this.channelId = channelId;
    this.reason = reason;
    Object.setPrototypeOf(this, ChannelSubscriptionException.prototype);
  }
}

export class ChannelUnsubscriptionException extends Error {
  public readonly name = "ChannelUnsubscriptionException";
  public readonly agentId: string;
  public readonly channelId: string;
  public readonly reason: string;

  constructor(
    agentId: string,
    channelId: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Channel unsubscription failed for agent '${agentId}' from channel '${channelId}': ${reason}`,
    );
    this.agentId = agentId;
    this.channelId = channelId;
    this.reason = reason;
    Object.setPrototypeOf(this, ChannelUnsubscriptionException.prototype);
  }
}

export class CommunicationManagerUnavailableException extends Error {
  public readonly name = "CommunicationManagerUnavailableException";

  constructor(message?: string) {
    super(message || "Communication manager is not available");
    Object.setPrototypeOf(
      this,
      CommunicationManagerUnavailableException.prototype,
    );
  }
}

export class AgentBusUnavailableException extends Error {
  public readonly name = "AgentBusUnavailableException";

  constructor(message?: string) {
    super(message || "Agent bus is not available");
    Object.setPrototypeOf(this, AgentBusUnavailableException.prototype);
  }
}

export class InvalidMessageException extends Error {
  public readonly name = "InvalidMessageException";
  public readonly missingFields: string[];

  constructor(missingFields: string[], message?: string) {
    super(
      message ||
        `Invalid message - missing fields: ${missingFields.join(", ")}`,
    );
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidMessageException.prototype);
  }
}

export class InvalidChannelException extends Error {
  public readonly name = "InvalidChannelException";
  public readonly channelId: string;
  public readonly reason: string;

  constructor(channelId: string, reason: string, message?: string) {
    super(message || `Invalid channel '${channelId}': ${reason}`);
    this.channelId = channelId;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidChannelException.prototype);
  }
}
