import { AgentTask, TaskState } from "./agent-task";
import { AgentPriority } from "../types";

export enum PlanState {
  DRAFT = "draft",
  VALIDATED = "validated",
  EXECUTING = "executing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled"
}

export enum ExecutionMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  MIXED = "mixed"
}

export interface PlanMetrics {
  createdAt: Date;
  validatedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  estimatedDurationMs: number;
  actualDurationMs?: number;
}

export interface AgentPlan<T = unknown> {
  planId: string;
  agentId: string;
  workspaceId: string;
  requestId: string;
  traceId: string;
  
  name: string;
  description: string;
  state: PlanState;
  priority: AgentPriority;
  executionMode: ExecutionMode;
  
  tasks: AgentTask<T>[];
  taskOrder: string[]; // Execution order for sequential tasks
  parallelGroups: string[][]; // Groups of tasks that can run in parallel
  
  timeoutMs: number;
  maxConcurrency: number;
  
  metadata: Record<string, unknown>;
  metrics: PlanMetrics;
}

export class AgentPlanBuilder<T = unknown> {
  private plan: Partial<AgentPlan<T>> = {
    tasks: [],
    taskOrder: [],
    parallelGroups: [],
    executionMode: ExecutionMode.SEQUENTIAL,
    timeoutMs: 300000, // 5 minutes default
    maxConcurrency: 5,
    metadata: {},
    metrics: {
      createdAt: new Date(),
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      estimatedDurationMs: 0
    }
  };

  public planId(planId: string): AgentPlanBuilder<T> {
    this.plan.planId = planId;
    return this;
  }

  public agentId(agentId: string): AgentPlanBuilder<T> {
    this.plan.agentId = agentId;
    return this;
  }

  public workspaceId(workspaceId: string): AgentPlanBuilder<T> {
    this.plan.workspaceId = workspaceId;
    return this;
  }

  public requestId(requestId: string): AgentPlanBuilder<T> {
    this.plan.requestId = requestId;
    return this;
  }

  public traceId(traceId: string): AgentPlanBuilder<T> {
    this.plan.traceId = traceId;
    return this;
  }

  public name(name: string): AgentPlanBuilder<T> {
    this.plan.name = name;
    return this;
  }

  public description(description: string): AgentPlanBuilder<T> {
    this.plan.description = description;
    return this;
  }

  public state(state: PlanState): AgentPlanBuilder<T> {
    this.plan.state = state;
    return this;
  }

  public priority(priority: AgentPriority): AgentPlanBuilder<T> {
    this.plan.priority = priority;
    return this;
  }

  public executionMode(mode: ExecutionMode): AgentPlanBuilder<T> {
    this.plan.executionMode = mode;
    return this;
  }

  public addTask(task: AgentTask<T>): AgentPlanBuilder<T> {
    this.plan.tasks!.push(task);
    this.plan.metrics!.totalTasks = this.plan.tasks!.length;
    return this;
  }

  public addTasks(tasks: AgentTask<T>[]): AgentPlanBuilder<T> {
    this.plan.tasks!.push(...tasks);
    this.plan.metrics!.totalTasks = this.plan.tasks!.length;
    return this;
  }

  public setTaskOrder(taskIds: string[]): AgentPlanBuilder<T> {
    this.plan.taskOrder = [...taskIds];
    return this;
  }

  public addParallelGroup(taskIds: string[]): AgentPlanBuilder<T> {
    this.plan.parallelGroups!.push([...taskIds]);
    return this;
  }

  public timeout(timeoutMs: number): AgentPlanBuilder<T> {
    this.plan.timeoutMs = timeoutMs;
    return this;
  }

  public maxConcurrency(maxConcurrency: number): AgentPlanBuilder<T> {
    this.plan.maxConcurrency = maxConcurrency;
    return this;
  }

  public estimatedDuration(durationMs: number): AgentPlanBuilder<T> {
    this.plan.metrics!.estimatedDurationMs = durationMs;
    return this;
  }

  public metadata(metadata: Record<string, unknown>): AgentPlanBuilder<T> {
    this.plan.metadata = { ...this.plan.metadata!, ...metadata };
    return this;
  }

  public build(): AgentPlan<T> {
    const requiredFields = [
      'planId', 'agentId', 'workspaceId', 'requestId', 'traceId',
      'name', 'state', 'priority'
    ];
    
    for (const field of requiredFields) {
      if (this.plan[field as keyof AgentPlan<T>] === undefined) {
        throw new Error(`Plan field '${field}' is required`);
      }
    }

    // Validate tasks exist for task order and parallel groups
    const taskIds = new Set(this.plan.tasks!.map(t => t.taskId));
    
    for (const taskId of this.plan.taskOrder!) {
      if (!taskIds.has(taskId)) {
        throw new Error(`Task '${taskId}' in task order not found in tasks`);
      }
    }
    
    for (const group of this.plan.parallelGroups!) {
      for (const taskId of group) {
        if (!taskIds.has(taskId)) {
          throw new Error(`Task '${taskId}' in parallel group not found in tasks`);
        }
      }
    }

    return {
      planId: this.plan.planId!,
      agentId: this.plan.agentId!,
      workspaceId: this.plan.workspaceId!,
      requestId: this.plan.requestId!,
      traceId: this.plan.traceId!,
      name: this.plan.name!,
      description: this.plan.description || "",
      state: this.plan.state!,
      priority: this.plan.priority!,
      executionMode: this.plan.executionMode!,
      tasks: this.plan.tasks!,
      taskOrder: this.plan.taskOrder!,
      parallelGroups: this.plan.parallelGroups!,
      timeoutMs: this.plan.timeoutMs!,
      maxConcurrency: this.plan.maxConcurrency!,
      metadata: this.plan.metadata!,
      metrics: this.plan.metrics!
    };
  }

  public static create<T = unknown>(): AgentPlanBuilder<T> {
    return new AgentPlanBuilder<T>();
  }
}