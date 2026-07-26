export class ToolAgentException extends Error {
  public readonly name = "ToolAgentException";
  public readonly operation?: string;
  
  constructor(operation?: string, message?: string) {
    super(message || `Tool agent operation${operation ? ` '${operation}'` : ''} failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, ToolAgentException.prototype);
  }
}

export class InvalidToolOperationException extends Error {
  public readonly name = "InvalidToolOperationException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid tool operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidToolOperationException.prototype);
  }
}

export class ToolNotFoundException extends Error {
  public readonly name = "ToolNotFoundException";
  public readonly toolName: string;
  
  constructor(toolName: string, message?: string) {
    super(message || `Tool '${toolName}' not found in registry`);
    this.toolName = toolName;
    Object.setPrototypeOf(this, ToolNotFoundException.prototype);
  }
}

export class ToolExecutionException extends Error {
  public readonly name = "ToolExecutionException";
  public readonly toolName: string;
  public readonly reason: string;
  
  constructor(toolName: string, reason: string, message?: string) {
    super(message || `Tool execution failed for '${toolName}': ${reason}`);
    this.toolName = toolName;
    this.reason = reason;
    Object.setPrototypeOf(this, ToolExecutionException.prototype);
  }
}

export class ToolValidationException extends Error {
  public readonly name = "ToolValidationException";
  public readonly toolName: string;
  public readonly validationErrors: string[];
  
  constructor(toolName: string, errors: string[], message?: string) {
    super(message || `Tool validation failed for '${toolName}': ${errors.join(", ")}`);
    this.toolName = toolName;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, ToolValidationException.prototype);
  }
}

export class ToolRegistryUnavailableException extends Error {
  public readonly name = "ToolRegistryUnavailableException";
  
  constructor(message?: string) {
    super(message || "Tool registry is not available");
    Object.setPrototypeOf(this, ToolRegistryUnavailableException.prototype);
  }
}

export class ToolExecutorUnavailableException extends Error {
  public readonly name = "ToolExecutorUnavailableException";
  
  constructor(message?: string) {
    super(message || "Tool executor is not available");
    Object.setPrototypeOf(this, ToolExecutorUnavailableException.prototype);
  }
}

export class BatchExecutionException extends Error {
  public readonly name = "BatchExecutionException";
  public readonly failedTools: string[];
  public readonly mode: string;
  
  constructor(mode: string, failedTools: string[], message?: string) {
    super(message || `Batch execution (${mode}) failed for tools: ${failedTools.join(", ")}`);
    this.mode = mode;
    this.failedTools = failedTools;
    Object.setPrototypeOf(this, BatchExecutionException.prototype);
  }
}

export class InvalidToolContextException extends Error {
  public readonly name = "InvalidToolContextException";
  public readonly missingFields: string[];
  
  constructor(missingFields: string[], message?: string) {
    super(message || `Invalid tool execution context - missing fields: ${missingFields.join(', ')}`);
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidToolContextException.prototype);
  }
}