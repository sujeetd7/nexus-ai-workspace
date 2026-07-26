import { AgentPriority } from "../types";

export enum TaskState {
  PENDING = "pending",
  WAITING = "waiting",
  READY = "ready",
  RUNNING = "running",
  SUCCESS = "success",
  FAILED = "failed",
  CANCELLED = "cancelled",
  TIMEOUT = "timeout"
}

export enum TaskType {
  EXECUTION = "execution",
  COMMUNICATION = "communication",
  MEMORY = "memory",
  ANALYSIS = "analysis",
  COORDINATION = "coordination"
}

export interface RetryStrategy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

export interface TaskMetrics {
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  attempts: number;
  lastError?: string;
}

export interface TaskDependency {
  taskId: string;
  type: "blocking" | "soft";
  condition?: string;
}

export interface AgentTask<T = unknown> {
  taskId: string;
  agentId: string;
  workspaceId: string;
  requestId: string;
  traceId: string;
  
  name: string;
  description: string;
  type: TaskType;
  state: TaskState;
  priority: AgentPriority;
  
  input: T;
  output?: unknown;
  error?: string;
  
  dependencies: TaskDependency[];
  timeoutMs: number;
  retryStrategy: RetryStrategy;
  
  metadata: Record<string, unknown>;
  metrics: TaskMetrics;
}

export class AgentTaskBuilder<T = unknown> {
  private task: Partial<AgentTask<T>> = {
    dependencies: [],
    retryStrategy: {
      maxAttempts: 3,
      backoffMs: 1000,
      backoffMultiplier: 2,
      maxBackoffMs: 30000
    },
    timeoutMs: 30000,
    metadata: {},
    metrics: {
      createdAt: new Date(),
      attempts: 0
    }
  };

  public taskId(taskId: string): AgentTaskBuilder<T> {
    this.task.taskId = taskId;
    return this;
  }

  public agentId(agentId: string): AgentTaskBuilder<T> {
    this.task.agentId = agentId;
    return this;
  }

  public workspaceId(workspaceId: string): AgentTaskBuilder<T> {
    this.task.workspaceId = workspaceId;
    return this;
  }

  public requestId(requestId: string): AgentTaskBuilder<T> {
    this.task.requestId = requestId;
    return this;
  }

  public traceId(traceId: string): AgentTaskBuilder<T> {
    this.task.traceId = traceId;
    return this;
  }

  public name(name: string): AgentTaskBuilder<T> {
    this.task.name = name;
    return this;
  }

  public description(description: string): AgentTaskBuilder<T> {
    this.task.description = description;
    return this;
  }

  public type(type: TaskType): AgentTaskBuilder<T> {
    this.task.type = type;
    return this;
  }

  public state(state: TaskState): AgentTaskBuilder<T> {
    this.task.state = state;
    return this;
  }

  public priority(priority: AgentPriority): AgentTaskBuilder<T> {
    this.task.priority = priority;
    return this;
  }

  public input(input: T): AgentTaskBuilder<T> {
    this.task.input = input;
    return this;
  }

  public addDependency(taskId: string, type: "blocking" | "soft" = "blocking", condition?: string): AgentTaskBuilder<T> {
    this.task.dependencies!.push({ taskId, type, condition });
    return this;
  }

  public timeout(timeoutMs: number): AgentTaskBuilder<T> {
    this.task.timeoutMs = timeoutMs;
    return this;
  }

  public retryStrategy(strategy: Partial<RetryStrategy>): AgentTaskBuilder<T> {
    this.task.retryStrategy = { ...this.task.retryStrategy!, ...strategy };
    return this;
  }

  public metadata(metadata: Record<string, unknown>): AgentTaskBuilder<T> {
    this.task.metadata = { ...this.task.metadata!, ...metadata };
    return this;
  }

  public build(): AgentTask<T> {
    const requiredFields = [
      'taskId', 'agentId', 'workspaceId', 'requestId', 'traceId',
      'name', 'type', 'state', 'priority', 'input'
    ];
    
    for (const field of requiredFields) {
      if (this.task[field as keyof AgentTask<T>] === undefined) {
        throw new Error(`Task field '${field}' is required`);
      }
    }

    return {
      taskId: this.task.taskId!,
      agentId: this.task.agentId!,
      workspaceId: this.task.workspaceId!,
      requestId: this.task.requestId!,
      traceId: this.task.traceId!,
      name: this.task.name!,
      description: this.task.description || "",
      type: this.task.type!,
      state: this.task.state!,
      priority: this.task.priority!,
      input: this.task.input!,
      output: this.task.output,
      error: this.task.error,
      dependencies: this.task.dependencies!,
      timeoutMs: this.task.timeoutMs!,
      retryStrategy: this.task.retryStrategy!,
      metadata: this.task.metadata!,
      metrics: this.task.metrics!
    };
  }

  public static create<T = unknown>(): AgentTaskBuilder<T> {
    return new AgentTaskBuilder<T>();
  }
}