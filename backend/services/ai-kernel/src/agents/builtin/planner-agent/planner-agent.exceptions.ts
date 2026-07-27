export class PlannerAgentException extends Error {
  public readonly name = "PlannerAgentException";
  public readonly operation?: string;

  constructor(operation?: string, message?: string) {
    super(
      message ||
        `Planner agent operation${operation ? ` '${operation}'` : ""} failed`,
    );
    this.operation = operation;
    Object.setPrototypeOf(this, PlannerAgentException.prototype);
  }
}

export class InvalidPlannerOperationException extends Error {
  public readonly name = "InvalidPlannerOperationException";
  public readonly operation: string;
  public readonly reason: string;

  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid planner operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidPlannerOperationException.prototype);
  }
}

export class PlanningException extends Error {
  public readonly name = "PlanningException";
  public readonly agentId: string;
  public readonly reason: string;

  constructor(agentId: string, reason: string, message?: string) {
    super(message || `Planning failed for agent '${agentId}': ${reason}`);
    this.agentId = agentId;
    this.reason = reason;
    Object.setPrototypeOf(this, PlanningException.prototype);
  }
}

export class PlanValidationException extends Error {
  public readonly name = "PlanValidationException";
  public readonly planId: string;
  public readonly validationErrors: string[];

  constructor(planId: string, errors: string[], message?: string) {
    super(
      message || `Plan validation failed for '${planId}': ${errors.join(", ")}`,
    );
    this.planId = planId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, PlanValidationException.prototype);
  }
}

export class PlanEstimationException extends Error {
  public readonly name = "PlanEstimationException";
  public readonly planId: string;
  public readonly reason: string;

  constructor(planId: string, reason: string, message?: string) {
    super(message || `Plan estimation failed for '${planId}': ${reason}`);
    this.planId = planId;
    this.reason = reason;
    Object.setPrototypeOf(this, PlanEstimationException.prototype);
  }
}

export class PlannerUnavailableException extends Error {
  public readonly name = "PlannerUnavailableException";

  constructor(message?: string) {
    super(message || "Planner is not available");
    Object.setPrototypeOf(this, PlannerUnavailableException.prototype);
  }
}

export class InvalidPlanException extends Error {
  public readonly name = "InvalidPlanException";
  public readonly planId?: string;
  public readonly validationErrors: string[];

  constructor(validationErrors: string[], planId?: string, message?: string) {
    super(
      message ||
        `Invalid plan${planId ? ` '${planId}'` : ""}: ${validationErrors.join(", ")}`,
    );
    this.planId = planId;
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, InvalidPlanException.prototype);
  }
}

export class ReplanningException extends Error {
  public readonly name = "ReplanningException";
  public readonly originalPlanId: string;
  public readonly reason: string;

  constructor(originalPlanId: string, reason: string, message?: string) {
    super(
      message || `Replanning failed for plan '${originalPlanId}': ${reason}`,
    );
    this.originalPlanId = originalPlanId;
    this.reason = reason;
    Object.setPrototypeOf(this, ReplanningException.prototype);
  }
}

export class InvalidPlannerContextException extends Error {
  public readonly name = "InvalidPlannerContextException";
  public readonly missingFields: string[];

  constructor(missingFields: string[], message?: string) {
    super(
      message ||
        `Invalid planner context - missing fields: ${missingFields.join(", ")}`,
    );
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidPlannerContextException.prototype);
  }
}
