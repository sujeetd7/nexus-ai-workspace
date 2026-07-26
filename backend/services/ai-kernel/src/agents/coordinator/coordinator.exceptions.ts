export class CoordinatorException extends Error {
  public readonly name = "CoordinatorException";
  public readonly operation: string;
  public readonly coordinationId?: string;
  
  constructor(operation: string, coordinationId?: string, message?: string) {
    super(message || `Coordination operation '${operation}' failed${coordinationId ? ` for coordination '${coordinationId}'` : ''}`);
    this.operation = operation;
    this.coordinationId = coordinationId;
    Object.setPrototypeOf(this, CoordinatorException.prototype);
  }
}

export class CoordinationNotFoundException extends Error {
  public readonly name = "CoordinationNotFoundException";
  public readonly coordinationId: string;
  
  constructor(coordinationId: string, message?: string) {
    super(message || `Coordination '${coordinationId}' not found`);
    this.coordinationId = coordinationId;
    Object.setPrototypeOf(this, CoordinationNotFoundException.prototype);
  }
}

export class InvalidCoordinationException extends Error {
  public readonly name = "InvalidCoordinationException";
  public readonly coordinationId: string;
  public readonly validationErrors: string[];
  
  constructor(coordinationId: string, errors: string[], message?: string) {
    super(message || `Invalid coordination '${coordinationId}': ${errors.join(", ")}`);
    this.coordinationId = coordinationId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, InvalidCoordinationException.prototype);
  }
}

export class CoordinationTimeoutException extends Error {
  public readonly name = "CoordinationTimeoutException";
  public readonly coordinationId: string;
  public readonly timeoutMs: number;
  
  constructor(coordinationId: string, timeoutMs: number, message?: string) {
    super(message || `Coordination '${coordinationId}' timed out after ${timeoutMs}ms`);
    this.coordinationId = coordinationId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, CoordinationTimeoutException.prototype);
  }
}

export class CoordinationCancelledException extends Error {
  public readonly name = "CoordinationCancelledException";
  public readonly coordinationId: string;
  
  constructor(coordinationId: string, message?: string) {
    super(message || `Coordination '${coordinationId}' was cancelled`);
    this.coordinationId = coordinationId;
    Object.setPrototypeOf(this, CoordinationCancelledException.prototype);
  }
}

export class AgentNotAvailableForCoordinationException extends Error {
  public readonly name = "AgentNotAvailableForCoordinationException";
  public readonly agentId: string;
  public readonly reason: string;
  
  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Agent '${agentId}' not available for coordination: ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, AgentNotAvailableForCoordinationException.prototype);
  }
}

export class InsufficientAgentsException extends Error {
  public readonly name = "InsufficientAgentsException";
  public readonly requiredCount: number;
  public readonly availableCount: number;
  
  constructor(requiredCount: number, availableCount: number, message?: string) {
    super(message || `Insufficient agents: required ${requiredCount}, available ${availableCount}`);
    this.requiredCount = requiredCount;
    this.availableCount = availableCount;
    Object.setPrototypeOf(this, InsufficientAgentsException.prototype);
  }
}

export class HandoffException extends Error {
  public readonly name = "HandoffException";
  public readonly fromAgentId: string;
  public readonly toAgentId: string;
  public readonly reason: string;
  
  constructor(fromAgentId: string, toAgentId: string, reason: string, message?: string) {
    super(message || `Handoff from '${fromAgentId}' to '${toAgentId}' failed: ${reason}`);
    this.fromAgentId = fromAgentId;
    this.toAgentId = toAgentId;
    this.reason = reason;
    Object.setPrototypeOf(this, HandoffException.prototype);
  }
}

export class BroadcastException extends Error {
  public readonly name = "BroadcastException";
  public readonly agentIds: string[];
  public readonly failedAgents: string[];
  
  constructor(agentIds: string[], failedAgents: string[], message?: string) {
    super(message || `Broadcast failed for agents: ${failedAgents.join(", ")}`);
    this.agentIds = agentIds;
    this.failedAgents = failedAgents;
    Object.setPrototypeOf(this, BroadcastException.prototype);
  }
}

export class QuorumNotReachedException extends Error {
  public readonly name = "QuorumNotReachedException";
  public readonly requiredQuorum: number;
  public readonly actualCount: number;
  
  constructor(requiredQuorum: number, actualCount: number, message?: string) {
    super(message || `Quorum not reached: required ${requiredQuorum}, actual ${actualCount}`);
    this.requiredQuorum = requiredQuorum;
    this.actualCount = actualCount;
    Object.setPrototypeOf(this, QuorumNotReachedException.prototype);
  }
}

export class VotingException extends Error {
  public readonly name = "VotingException";
  public readonly votingMethod: string;
  public readonly reason: string;
  
  constructor(votingMethod: string, reason: string, message?: string) {
    super(message || `Voting failed using method '${votingMethod}': ${reason}`);
    this.votingMethod = votingMethod;
    this.reason = reason;
    Object.setPrototypeOf(this, VotingException.prototype);
  }
}