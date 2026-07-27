export class OrchestratorAgentException extends Error {
  public readonly name = "OrchestratorAgentException";
  public readonly operation?: string;

  constructor(operation?: string, message?: string) {
    super(
      message ||
        `Orchestrator agent operation${operation ? ` '${operation}'` : ""} failed`,
    );
    this.operation = operation;
    Object.setPrototypeOf(this, OrchestratorAgentException.prototype);
  }
}

export class InvalidOrchestratorOperationException extends Error {
  public readonly name = "InvalidOrchestratorOperationException";
  public readonly operation: string;
  public readonly reason: string;

  constructor(operation: string, reason: string, message?: string) {
    super(
      message || `Invalid orchestrator operation '${operation}': ${reason}`,
    );
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(
      this,
      InvalidOrchestratorOperationException.prototype,
    );
  }
}

export class AgentExecutionAgentException extends Error {
  public readonly name = "AgentExecutionAgentException";
  public readonly agentId: string;
  public readonly reason: string;

  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Agent execution failed for '${agentId}': ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, AgentExecutionAgentException.prototype);
  }
}

export class WorkflowExecutionAgentException extends Error {
  public readonly name = "WorkflowExecutionAgentException";
  public readonly workflowId: string;
  public readonly reason: string;

  constructor(workflowId: string, reason: string, message?: string) {
    super(
      message || `Workflow execution failed for '${workflowId}': ${reason}`,
    );
    this.workflowId = workflowId;
    this.reason = reason;
    Object.setPrototypeOf(this, WorkflowExecutionAgentException.prototype);
  }
}

export class PlanExecutionAgentException extends Error {
  public readonly name = "PlanExecutionAgentException";
  public readonly planId: string;
  public readonly reason: string;

  constructor(planId: string, reason: string, message?: string) {
    super(message || `Plan execution failed for '${planId}': ${reason}`);
    this.planId = planId;
    this.reason = reason;
    Object.setPrototypeOf(this, PlanExecutionAgentException.prototype);
  }
}

export class ExecutionCancellationAgentException extends Error {
  public readonly name = "ExecutionCancellationAgentException";
  public readonly executionId: string;
  public readonly reason: string;

  constructor(executionId: string, reason: string, message?: string) {
    super(
      message ||
        `Execution cancellation failed for '${executionId}': ${reason}`,
    );
    this.executionId = executionId;
    this.reason = reason;
    Object.setPrototypeOf(this, ExecutionCancellationAgentException.prototype);
  }
}

export class OrchestratorHealthAgentException extends Error {
  public readonly name = "OrchestratorHealthAgentException";
  public readonly reason: string;

  constructor(reason: string, message?: string) {
    super(message || `Orchestrator health check failed: ${reason}`);
    this.reason = reason;
    Object.setPrototypeOf(this, OrchestratorHealthAgentException.prototype);
  }
}

export class AgentOrchestratorUnavailableException extends Error {
  public readonly name = "AgentOrchestratorUnavailableException";

  constructor(message?: string) {
    super(message || "Agent orchestrator is not available");
    Object.setPrototypeOf(
      this,
      AgentOrchestratorUnavailableException.prototype,
    );
  }
}

export class InvalidOrchestratorExecutionRequestException extends Error {
  public readonly name = "InvalidOrchestratorExecutionRequestException";
  public readonly missingFields: string[];

  constructor(missingFields: string[], message?: string) {
    super(
      message ||
        `Invalid execution request - missing fields: ${missingFields.join(", ")}`,
    );
    this.missingFields = missingFields;
    Object.setPrototypeOf(
      this,
      InvalidOrchestratorExecutionRequestException.prototype,
    );
  }
}
