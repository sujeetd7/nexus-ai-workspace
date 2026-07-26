export class CoordinatorAgentException extends Error {
  public readonly name = "CoordinatorAgentException";
  public readonly operation?: string;
  
  constructor(operation?: string, message?: string) {
    super(message || `Coordinator agent operation${operation ? ` '${operation}'` : ''} failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, CoordinatorAgentException.prototype);
  }
}

export class InvalidCoordinatorOperationException extends Error {
  public readonly name = "InvalidCoordinatorOperationException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid coordinator operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidCoordinatorOperationException.prototype);
  }
}

export class CoordinatorAssignmentException extends Error {
  public readonly name = "CoordinatorAssignmentException";
  public readonly agentIds: string[];
  public readonly reason: string;
  
  constructor(agentIds: string[], reason: string, message?: string) {
    super(message || `Coordination assignment failed for agents [${agentIds.join(', ')}]: ${reason}`);
    this.agentIds = agentIds;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorAssignmentException.prototype);
  }
}

export class CoordinatorDelegationException extends Error {
  public readonly name = "CoordinatorDelegationException";
  public readonly agentId: string;
  public readonly reason: string;
  
  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Task delegation failed for agent '${agentId}': ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorDelegationException.prototype);
  }
}

export class CoordinatorHandoffException extends Error {
  public readonly name = "CoordinatorHandoffException";
  public readonly fromAgentId: string;
  public readonly toAgentId: string;
  public readonly reason: string;
  
  constructor(fromAgentId: string, toAgentId: string, reason: string, message?: string) {
    super(message || `Handoff failed from '${fromAgentId}' to '${toAgentId}': ${reason}`);
    this.fromAgentId = fromAgentId;
    this.toAgentId = toAgentId;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorHandoffException.prototype);
  }
}

export class CoordinatorBroadcastException extends Error {
  public readonly name = "CoordinatorBroadcastException";
  public readonly recipientCount: number;
  public readonly reason: string;
  
  constructor(recipientCount: number, reason: string, message?: string) {
    super(message || `Broadcast failed to ${recipientCount} recipients: ${reason}`);
    this.recipientCount = recipientCount;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorBroadcastException.prototype);
  }
}

export class CoordinatorCollectionException extends Error {
  public readonly name = "CoordinatorCollectionException";
  public readonly coordinationId: string;
  public readonly reason: string;
  
  constructor(coordinationId: string, reason: string, message?: string) {
    super(message || `Result collection failed for coordination '${coordinationId}': ${reason}`);
    this.coordinationId = coordinationId;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorCollectionException.prototype);
  }
}

export class CoordinatorCancellationException extends Error {
  public readonly name = "CoordinatorCancellationException";
  public readonly coordinationId: string;
  public readonly reason: string;
  
  constructor(coordinationId: string, reason: string, message?: string) {
    super(message || `Coordination cancellation failed for '${coordinationId}': ${reason}`);
    this.coordinationId = coordinationId;
    this.reason = reason;
    Object.setPrototypeOf(this, CoordinatorCancellationException.prototype);
  }
}

export class AgentCoordinatorUnavailableException extends Error {
  public readonly name = "AgentCoordinatorUnavailableException";
  
  constructor(message?: string) {
    super(message || "Agent coordinator is not available");
    Object.setPrototypeOf(this, AgentCoordinatorUnavailableException.prototype);
  }
}

export class InvalidCoordinationContextException extends Error {
  public readonly name = "InvalidCoordinationContextException";
  public readonly missingFields: string[];
  
  constructor(missingFields: string[], message?: string) {
    super(message || `Invalid coordination context - missing fields: ${missingFields.join(', ')}`);
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidCoordinationContextException.prototype);
  }
}