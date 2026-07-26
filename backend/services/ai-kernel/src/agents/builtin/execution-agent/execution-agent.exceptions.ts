export class ExecutionAgentException extends Error {
  public readonly name = "ExecutionAgentException";
  public readonly operation?: string;
  
  constructor(operation?: string, message?: string) {
    super(message || `Execution agent operation${operation ? ` '${operation}'` : ''} failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, ExecutionAgentException.prototype);
  }
}

export class InvalidExecutionOperationException extends Error {
  public readonly name = "InvalidExecutionOperationException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid execution operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidExecutionOperationException.prototype);
  }
}

export class ExecutionAgentRuntimeException extends Error {
  public readonly name = "ExecutionAgentRuntimeException";
  public readonly agentId: string;
  public readonly reason: string;
  
  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Agent execution failed for '${agentId}': ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, ExecutionAgentRuntimeException.prototype);
  }
}

export class BatchExecutionAgentException extends Error {
  public readonly name = "BatchExecutionAgentException";
  public readonly batchSize: number;
  public readonly reason: string;
  
  constructor(batchSize: number, reason: string, message?: string) {
    super(message || `Batch execution failed for ${batchSize} requests: ${reason}`);
    this.batchSize = batchSize;
    this.reason = reason;
    Object.setPrototypeOf(this, BatchExecutionAgentException.prototype);
  }
}

export class ExecutionCancellationException extends Error {
  public readonly name = "ExecutionCancellationException";
  public readonly executionId: string;
  public readonly reason: string;
  
  constructor(executionId: string, reason: string, message?: string) {
    super(message || `Execution cancellation failed for '${executionId}': ${reason}`);
    this.executionId = executionId;
    this.reason = reason;
    Object.setPrototypeOf(this, ExecutionCancellationException.prototype);
  }
}

export class ExecutionStatusException extends Error {
  public readonly name = "ExecutionStatusException";
  public readonly executionId: string;
  public readonly reason: string;
  
  constructor(executionId: string, reason: string, message?: string) {
    super(message || `Execution status retrieval failed for '${executionId}': ${reason}`);
    this.executionId = executionId;
    this.reason = reason;
    Object.setPrototypeOf(this, ExecutionStatusException.prototype);
  }
}

export class AgentRuntimeUnavailableException extends Error {
  public readonly name = "AgentRuntimeUnavailableException";
  
  constructor(message?: string) {
    super(message || "Agent runtime is not available");
    Object.setPrototypeOf(this, AgentRuntimeUnavailableException.prototype);
  }
}

export class InvalidExecutionContextException extends Error {
  public readonly name = "InvalidExecutionContextException";
  public readonly missingFields: string[];
  
  constructor(missingFields: string[], message?: string) {
    super(message || `Invalid execution context - missing fields: ${missingFields.join(', ')}`);
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidExecutionContextException.prototype);
  }
}