export class WorkflowNotFoundException extends Error {
  public readonly name = "WorkflowNotFoundException";
  public readonly workflowId: string;

  constructor(workflowId: string, message?: string) {
    super(message || `Workflow with ID '${workflowId}' not found`);
    this.workflowId = workflowId;
    Object.setPrototypeOf(this, WorkflowNotFoundException.prototype);
  }
}

export class DuplicateWorkflowException extends Error {
  public readonly name = "DuplicateWorkflowException";
  public readonly workflowId: string;

  constructor(workflowId: string, message?: string) {
    super(message || `Workflow with ID '${workflowId}' already exists`);
    this.workflowId = workflowId;
    Object.setPrototypeOf(this, DuplicateWorkflowException.prototype);
  }
}

export class WorkflowValidationException extends Error {
  public readonly name = "WorkflowValidationException";
  public readonly workflowId: string;
  public readonly validationErrors: string[];

  constructor(workflowId: string, errors: string[], message?: string) {
    super(
      message ||
        `Workflow '${workflowId}' validation failed: ${errors.join(", ")}`,
    );
    this.workflowId = workflowId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, WorkflowValidationException.prototype);
  }
}

export class WorkflowExecutionException extends Error {
  public readonly name = "WorkflowExecutionException";
  public readonly executionId: string;
  public readonly workflowId: string;
  public readonly stepId?: string;

  constructor(
    executionId: string,
    workflowId: string,
    stepId?: string,
    message?: string,
  ) {
    super(
      message ||
        `Workflow execution failed: ${executionId} (workflow: ${workflowId}${stepId ? `, step: ${stepId}` : ""})`,
    );
    this.executionId = executionId;
    this.workflowId = workflowId;
    this.stepId = stepId;
    Object.setPrototypeOf(this, WorkflowExecutionException.prototype);
  }
}

export class WorkflowStepException extends Error {
  public readonly name = "WorkflowStepException";
  public readonly stepId: string;
  public readonly executionId: string;
  public readonly stepType: string;

  constructor(
    stepId: string,
    executionId: string,
    stepType: string,
    message?: string,
  ) {
    super(
      message ||
        `Workflow step '${stepId}' (type: ${stepType}) failed in execution '${executionId}'`,
    );
    this.stepId = stepId;
    this.executionId = executionId;
    this.stepType = stepType;
    Object.setPrototypeOf(this, WorkflowStepException.prototype);
  }
}

export class WorkflowTimeoutException extends Error {
  public readonly name = "WorkflowTimeoutException";
  public readonly executionId: string;
  public readonly timeoutMs: number;

  constructor(executionId: string, timeoutMs: number, message?: string) {
    super(
      message ||
        `Workflow execution '${executionId}' timed out after ${timeoutMs}ms`,
    );
    this.executionId = executionId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, WorkflowTimeoutException.prototype);
  }
}

export class WorkflowCancelledException extends Error {
  public readonly name = "WorkflowCancelledException";
  public readonly executionId: string;

  constructor(executionId: string, message?: string) {
    super(message || `Workflow execution '${executionId}' was cancelled`);
    this.executionId = executionId;
    Object.setPrototypeOf(this, WorkflowCancelledException.prototype);
  }
}

export class WorkflowCompensationException extends Error {
  public readonly name = "WorkflowCompensationException";
  public readonly executionId: string;
  public readonly stepId: string;

  constructor(executionId: string, stepId: string, message?: string) {
    super(
      message ||
        `Compensation failed for step '${stepId}' in execution '${executionId}'`,
    );
    this.executionId = executionId;
    this.stepId = stepId;
    Object.setPrototypeOf(this, WorkflowCompensationException.prototype);
  }
}

export class WorkflowConditionException extends Error {
  public readonly name = "WorkflowConditionException";
  public readonly condition: string;
  public readonly executionId: string;

  constructor(condition: string, executionId: string, message?: string) {
    super(
      message ||
        `Condition evaluation failed: '${condition}' in execution '${executionId}'`,
    );
    this.condition = condition;
    this.executionId = executionId;
    Object.setPrototypeOf(this, WorkflowConditionException.prototype);
  }
}
