export class AgentNotFoundException extends Error {
  public readonly name = "AgentNotFoundException";
  public readonly agentId: string;

  constructor(agentId: string, message?: string) {
    super(message || `Agent with ID '${agentId}' not found`);
    this.agentId = agentId;
    Object.setPrototypeOf(this, AgentNotFoundException.prototype);
  }
}

export class DuplicateAgentException extends Error {
  public readonly name = "DuplicateAgentException";
  public readonly agentId: string;

  constructor(agentId: string, message?: string) {
    super(message || `Agent with ID '${agentId}' already exists`);
    this.agentId = agentId;
    Object.setPrototypeOf(this, DuplicateAgentException.prototype);
  }
}

export class AgentRegistrationException extends Error {
  public readonly name = "AgentRegistrationException";
  public readonly agentId?: string;
  public readonly reason: string;

  constructor(reason: string, agentId?: string, message?: string) {
    super(
      message ||
        `Agent registration failed: ${reason}${agentId ? ` (Agent ID: ${agentId})` : ""}`,
    );
    this.reason = reason;
    this.agentId = agentId;
    Object.setPrototypeOf(this, AgentRegistrationException.prototype);
  }
}

export class InvalidStateTransitionException extends Error {
  public readonly name = "InvalidStateTransitionException";
  public readonly agentId: string;
  public readonly fromState: string;
  public readonly toState: string;

  constructor(
    agentId: string,
    fromState: string,
    toState: string,
    message?: string,
  ) {
    super(
      message ||
        `Invalid state transition for agent '${agentId}': from '${fromState}' to '${toState}'`,
    );
    this.agentId = agentId;
    this.fromState = fromState;
    this.toState = toState;
    Object.setPrototypeOf(this, InvalidStateTransitionException.prototype);
  }
}

export class AgentLifecycleException extends Error {
  public readonly name = "AgentLifecycleException";
  public readonly agentId: string;
  public readonly operation: string;
  public readonly reason: string;

  constructor(
    agentId: string,
    operation: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Agent lifecycle operation '${operation}' failed for agent '${agentId}': ${reason}`,
    );
    this.agentId = agentId;
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, AgentLifecycleException.prototype);
  }
}

export class AgentExecutionException extends Error {
  public readonly name = "AgentExecutionException";
  public readonly agentId: string;
  public readonly executionId: string;
  public readonly reason: string;

  constructor(
    agentId: string,
    executionId: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Agent execution failed for agent '${agentId}' (execution: ${executionId}): ${reason}`,
    );
    this.agentId = agentId;
    this.executionId = executionId;
    this.reason = reason;
    Object.setPrototypeOf(this, AgentExecutionException.prototype);
  }
}

export class ExecutionTimeoutException extends Error {
  public readonly name = "ExecutionTimeoutException";
  public readonly executionId: string;
  public readonly timeoutMs: number;

  constructor(executionId: string, timeoutMs: number, message?: string) {
    super(
      message || `Execution '${executionId}' timed out after ${timeoutMs}ms`,
    );
    this.executionId = executionId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, ExecutionTimeoutException.prototype);
  }
}

export class ExecutionCancelledException extends Error {
  public readonly name = "ExecutionCancelledException";
  public readonly executionId: string;

  constructor(executionId: string, message?: string) {
    super(message || `Execution '${executionId}' was cancelled`);
    this.executionId = executionId;
    Object.setPrototypeOf(this, ExecutionCancelledException.prototype);
  }
}

export class ExecutionNotFoundException extends Error {
  public readonly name = "ExecutionNotFoundException";
  public readonly executionId: string;

  constructor(executionId: string, message?: string) {
    super(message || `Execution '${executionId}' not found`);
    this.executionId = executionId;
    Object.setPrototypeOf(this, ExecutionNotFoundException.prototype);
  }
}
