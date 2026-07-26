export class OrchestratorException extends Error {
  public readonly name = "OrchestratorException";
  public readonly operation: string;
  
  constructor(operation: string, message?: string) {
    super(message || `Orchestrator operation '${operation}' failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, OrchestratorException.prototype);
  }
}

export class OrchestratorNotReadyException extends Error {
  public readonly name = "OrchestratorNotReadyException";
  public readonly currentState: string;
  
  constructor(currentState: string, message?: string) {
    super(message || `Orchestrator not ready for operation (current state: ${currentState})`);
    this.currentState = currentState;
    Object.setPrototypeOf(this, OrchestratorNotReadyException.prototype);
  }
}

export class OrchestratorExecutionNotFoundException extends Error {
  public readonly name = "OrchestratorExecutionNotFoundException";
  public readonly executionId: string;
  
  constructor(executionId: string, message?: string) {
    super(message || `Orchestrator execution '${executionId}' not found`);
    this.executionId = executionId;
    Object.setPrototypeOf(this, OrchestratorExecutionNotFoundException.prototype);
  }
}

export class InvalidExecutionRequestException extends Error {
  public readonly name = "InvalidExecutionRequestException";
  public readonly requestType: string;
  public readonly validationErrors: string[];
  
  constructor(requestType: string, errors: string[], message?: string) {
    super(message || `Invalid ${requestType} execution request: ${errors.join(", ")}`);
    this.requestType = requestType;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, InvalidExecutionRequestException.prototype);
  }
}

export class AgentNotAvailableException extends Error {
  public readonly name = "AgentNotAvailableException";
  public readonly agentId: string;
  public readonly reason: string;
  
  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Agent '${agentId}' not available: ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, AgentNotAvailableException.prototype);
  }
}

export class OrchestratorTimeoutException extends Error {
  public readonly name = "OrchestratorTimeoutException";
  public readonly executionId: string;
  public readonly timeoutMs: number;
  
  constructor(executionId: string, timeoutMs: number, message?: string) {
    super(message || `Orchestrator execution '${executionId}' timed out after ${timeoutMs}ms`);
    this.executionId = executionId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, OrchestratorTimeoutException.prototype);
  }
}

export class OrchestratorCancelledException extends Error {
  public readonly name = "OrchestratorCancelledException";
  public readonly executionId: string;
  
  constructor(executionId: string, message?: string) {
    super(message || `Orchestrator execution '${executionId}' was cancelled`);
    this.executionId = executionId;
    Object.setPrototypeOf(this, OrchestratorCancelledException.prototype);
  }
}

export class ComponentUnavailableException extends Error {
  public readonly name = "ComponentUnavailableException";
  public readonly componentName: string;
  public readonly reason: string;
  
  constructor(componentName: string, reason: string, message?: string) {
    super(message || `Component '${componentName}' unavailable: ${reason}`);
    this.componentName = componentName;
    this.reason = reason;
    Object.setPrototypeOf(this, ComponentUnavailableException.prototype);
  }
}