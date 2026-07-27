export class WorkflowAgentException extends Error {
  public readonly name = "WorkflowAgentException";
  public readonly operation?: string;

  constructor(operation?: string, message?: string) {
    super(
      message ||
        `Workflow agent operation${operation ? ` '${operation}'` : ""} failed`,
    );
    this.operation = operation;
    Object.setPrototypeOf(this, WorkflowAgentException.prototype);
  }
}

export class InvalidWorkflowOperationException extends Error {
  public readonly name = "InvalidWorkflowOperationException";
  public readonly operation: string;
  public readonly reason: string;

  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid workflow operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidWorkflowOperationException.prototype);
  }
}

export class WorkflowAgentExecutionException extends Error {
  public readonly name = "WorkflowAgentExecutionException";
  public readonly workflowId: string;
  public readonly reason: string;

  constructor(workflowId: string, reason: string, message?: string) {
    super(
      message || `Workflow execution failed for '${workflowId}': ${reason}`,
    );
    this.workflowId = workflowId;
    this.reason = reason;
    Object.setPrototypeOf(this, WorkflowAgentExecutionException.prototype);
  }
}

export class WorkflowValidationAgentException extends Error {
  public readonly name = "WorkflowValidationAgentException";
  public readonly workflowId: string;
  public readonly validationErrors: string[];

  constructor(workflowId: string, errors: string[], message?: string) {
    super(
      message ||
        `Workflow validation failed for '${workflowId}': ${errors.join(", ")}`,
    );
    this.workflowId = workflowId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, WorkflowValidationAgentException.prototype);
  }
}

export class WorkflowControlException extends Error {
  public readonly name = "WorkflowControlException";
  public readonly executionId: string;
  public readonly operation: string;
  public readonly reason: string;

  constructor(
    executionId: string,
    operation: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Workflow ${operation} failed for execution '${executionId}': ${reason}`,
    );
    this.executionId = executionId;
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, WorkflowControlException.prototype);
  }
}

export class WorkflowEngineUnavailableException extends Error {
  public readonly name = "WorkflowEngineUnavailableException";

  constructor(message?: string) {
    super(message || "Workflow engine is not available");
    Object.setPrototypeOf(this, WorkflowEngineUnavailableException.prototype);
  }
}

export class InvalidWorkflowContextException extends Error {
  public readonly name = "InvalidWorkflowContextException";
  public readonly missingFields: string[];

  constructor(missingFields: string[], message?: string) {
    super(
      message ||
        `Invalid workflow context - missing fields: ${missingFields.join(", ")}`,
    );
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidWorkflowContextException.prototype);
  }
}
