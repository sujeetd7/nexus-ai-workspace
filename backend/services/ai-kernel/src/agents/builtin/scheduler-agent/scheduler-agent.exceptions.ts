export class SchedulerAgentException extends Error {
  public readonly name = "SchedulerAgentException";
  public readonly operation?: string;
  
  constructor(operation?: string, message?: string) {
    super(message || `Scheduler agent operation${operation ? ` '${operation}'` : ''} failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, SchedulerAgentException.prototype);
  }
}

export class InvalidSchedulerOperationException extends Error {
  public readonly name = "InvalidSchedulerOperationException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid scheduler operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidSchedulerOperationException.prototype);
  }
}

export class TaskSchedulingException extends Error {
  public readonly name = "TaskSchedulingException";
  public readonly taskId: string;
  public readonly reason: string;
  
  constructor(taskId: string, reason: string, message?: string) {
    super(message || `Task scheduling failed for '${taskId}': ${reason}`);
    this.taskId = taskId;
    this.reason = reason;
    Object.setPrototypeOf(this, TaskSchedulingException.prototype);
  }
}

export class TaskEnqueueException extends Error {
  public readonly name = "TaskEnqueueException";
  public readonly taskCount: number;
  public readonly reason: string;
  
  constructor(taskCount: number, reason: string, message?: string) {
    super(message || `Task enqueue failed for ${taskCount} tasks: ${reason}`);
    this.taskCount = taskCount;
    this.reason = reason;
    Object.setPrototypeOf(this, TaskEnqueueException.prototype);
  }
}

export class TaskDequeueException extends Error {
  public readonly name = "TaskDequeueException";
  public readonly reason: string;
  
  constructor(reason: string, message?: string) {
    super(message || `Task dequeue failed: ${reason}`);
    this.reason = reason;
    Object.setPrototypeOf(this, TaskDequeueException.prototype);
  }
}

export class TaskCancellationException extends Error {
  public readonly name = "TaskCancellationException";
  public readonly taskId: string;
  public readonly reason: string;
  
  constructor(taskId: string, reason: string, message?: string) {
    super(message || `Task cancellation failed for '${taskId}': ${reason}`);
    this.taskId = taskId;
    this.reason = reason;
    Object.setPrototypeOf(this, TaskCancellationException.prototype);
  }
}

export class SchedulerControlException extends Error {
  public readonly name = "SchedulerControlException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Scheduler ${operation} failed: ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, SchedulerControlException.prototype);
  }
}

export class SchedulerMetricsException extends Error {
  public readonly name = "SchedulerMetricsException";
  public readonly reason: string;
  
  constructor(reason: string, message?: string) {
    super(message || `Scheduler metrics retrieval failed: ${reason}`);
    this.reason = reason;
    Object.setPrototypeOf(this, SchedulerMetricsException.prototype);
  }
}

export class AgentSchedulerUnavailableException extends Error {
  public readonly name = "AgentSchedulerUnavailableException";
  
  constructor(message?: string) {
    super(message || "Agent scheduler is not available");
    Object.setPrototypeOf(this, AgentSchedulerUnavailableException.prototype);
  }
}

export class InvalidTaskException extends Error {
  public readonly name = "InvalidTaskException";
  public readonly missingFields: string[];
  
  constructor(missingFields: string[], message?: string) {
    super(message || `Invalid task - missing fields: ${missingFields.join(', ')}`);
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidTaskException.prototype);
  }
}

export class InvalidTasksArrayException extends Error {
  public readonly name = "InvalidTasksArrayException";
  public readonly reason: string;
  
  constructor(reason: string, message?: string) {
    super(message || `Invalid tasks array: ${reason}`);
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidTasksArrayException.prototype);
  }
}