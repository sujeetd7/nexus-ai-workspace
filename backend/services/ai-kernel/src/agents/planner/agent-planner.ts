import { randomUUID } from "crypto";
import { AgentTask, TaskState, TaskType, AgentTaskBuilder } from "./agent-task";
import {
  AgentPlan,
  PlanState,
  ExecutionMode,
  AgentPlanBuilder,
} from "./agent-plan";
import { AgentPriority } from "../types";

export interface PlanningRequest<T = unknown> {
  agentId: string;
  workspaceId: string;
  requestId: string;
  traceId: string;
  name: string;
  description?: string;
  priority: AgentPriority;
  tasks: Partial<AgentTask<T>>[];
  executionMode?: ExecutionMode;
  maxConcurrency?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface PlanValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  estimatedDurationMs: number;
}

export interface TaskSplitResult<T = unknown> {
  originalTaskId: string;
  subtasks: AgentTask<T>[];
  parallelGroups: string[][];
}

export interface IAgentPlanner<T = unknown> {
  createPlan(request: PlanningRequest<T>): Promise<AgentPlan<T>>;
  validatePlan(plan: AgentPlan<T>): Promise<PlanValidationResult>;
  splitTasks(
    task: AgentTask<T>,
    maxSubtasks?: number,
  ): Promise<TaskSplitResult<T>>;
  estimate(plan: AgentPlan<T>): Promise<number>;
  prioritize(tasks: AgentTask<T>[]): Promise<AgentTask<T>[]>;
  merge(plans: AgentPlan<T>[]): Promise<AgentPlan<T>>;
}

export class AgentPlanner<T = unknown> implements IAgentPlanner<T> {
  private readonly defaultTimeoutMs = 300000; // 5 minutes
  private readonly defaultMaxConcurrency = 5;

  public async createPlan(request: PlanningRequest<T>): Promise<AgentPlan<T>> {
    const planId = randomUUID();

    // Build complete tasks from partial task data
    const tasks = request.tasks.map((taskData, index) => {
      const taskId = taskData.taskId || `${planId}_task_${index}`;

      return AgentTaskBuilder.create<T>()
        .taskId(taskId)
        .agentId(request.agentId)
        .workspaceId(request.workspaceId)
        .requestId(request.requestId)
        .traceId(request.traceId)
        .name(taskData.name || `Task ${index + 1}`)
        .description(taskData.description || "")
        .type(taskData.type || TaskType.EXECUTION)
        .state(taskData.state || TaskState.PENDING)
        .priority(taskData.priority || request.priority)
        .input(taskData.input!)
        .timeout(taskData.timeoutMs || this.defaultTimeoutMs)
        .metadata(taskData.metadata || {})
        .build();
    });

    // Determine execution order based on dependencies
    const { taskOrder, parallelGroups } = this.buildExecutionPlan(
      tasks,
      request.executionMode,
    );

    // Estimate total duration
    const estimatedDuration = await this.estimate({
      tasks,
      executionMode: request.executionMode || ExecutionMode.SEQUENTIAL,
      maxConcurrency: request.maxConcurrency || this.defaultMaxConcurrency,
    } as AgentPlan<T>);

    const plan = AgentPlanBuilder.create<T>()
      .planId(planId)
      .agentId(request.agentId)
      .workspaceId(request.workspaceId)
      .requestId(request.requestId)
      .traceId(request.traceId)
      .name(request.name)
      .description(request.description || "")
      .state(PlanState.DRAFT)
      .priority(request.priority)
      .executionMode(request.executionMode || ExecutionMode.SEQUENTIAL)
      .addTasks(tasks)
      .setTaskOrder(taskOrder)
      .timeout(request.timeoutMs || this.defaultTimeoutMs)
      .maxConcurrency(request.maxConcurrency || this.defaultMaxConcurrency)
      .estimatedDuration(estimatedDuration)
      .metadata(request.metadata || {})
      .build();

    // Add parallel groups
    for (const group of parallelGroups) {
      plan.parallelGroups.push(group);
    }

    return plan;
  }

  public async validatePlan(plan: AgentPlan<T>): Promise<PlanValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate basic plan structure
    if (!plan.tasks || plan.tasks.length === 0) {
      errors.push("Plan must contain at least one task");
    }

    // Validate task dependencies
    const taskIds = new Set(plan.tasks.map((t) => t.taskId));
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep.taskId)) {
          errors.push(
            `Task '${task.taskId}' has dependency on non-existent task '${dep.taskId}'`,
          );
        }
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(plan.tasks)) {
      errors.push("Plan contains circular dependencies");
    }

    // Validate execution order
    for (const taskId of plan.taskOrder) {
      if (!taskIds.has(taskId)) {
        errors.push(`Task order contains non-existent task '${taskId}'`);
      }
    }

    // Validate parallel groups
    for (const group of plan.parallelGroups) {
      for (const taskId of group) {
        if (!taskIds.has(taskId)) {
          errors.push(`Parallel group contains non-existent task '${taskId}'`);
        }
      }

      // Check for conflicting dependencies in parallel groups
      const groupTasks = plan.tasks.filter((t) => group.includes(t.taskId));
      if (this.hasConflictingDependencies(groupTasks)) {
        warnings.push(
          `Parallel group contains tasks with conflicting dependencies: ${group.join(", ")}`,
        );
      }
    }

    // Validate timeouts
    if (plan.timeoutMs <= 0) {
      errors.push("Plan timeout must be positive");
    }

    for (const task of plan.tasks) {
      if (task.timeoutMs <= 0) {
        errors.push(`Task '${task.taskId}' timeout must be positive`);
      }
      if (task.timeoutMs > plan.timeoutMs) {
        warnings.push(
          `Task '${task.taskId}' timeout (${task.timeoutMs}ms) exceeds plan timeout (${plan.timeoutMs}ms)`,
        );
      }
    }

    // Estimate duration
    const estimatedDurationMs = await this.estimate(plan);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      estimatedDurationMs,
    };
  }

  public async splitTasks(
    task: AgentTask<T>,
    maxSubtasks: number = 5,
  ): Promise<TaskSplitResult<T>> {
    const subtasks: AgentTask<T>[] = [];
    const parallelGroups: string[][] = [];

    // Simple task splitting strategy - split based on task type
    switch (task.type) {
      case TaskType.EXECUTION:
        // Split execution into preparation, execution, and cleanup
        subtasks.push(
          this.createSubtask(task, "prepare", "Preparation phase"),
          this.createSubtask(task, "execute", "Main execution phase"),
          this.createSubtask(task, "cleanup", "Cleanup phase"),
        );
        break;

      case TaskType.COMMUNICATION:
        // Split communication into send and receive
        subtasks.push(
          this.createSubtask(task, "send", "Send message"),
          this.createSubtask(task, "receive", "Receive response"),
        );
        break;

      case TaskType.ANALYSIS:
        // Split analysis into data collection, processing, and reporting
        subtasks.push(
          this.createSubtask(task, "collect", "Data collection"),
          this.createSubtask(task, "process", "Data processing"),
          this.createSubtask(task, "report", "Generate report"),
        );
        break;

      default:
        // For other types, create sequential subtasks
        const numSubtasks = Math.min(maxSubtasks, 3);
        for (let i = 0; i < numSubtasks; i++) {
          subtasks.push(
            this.createSubtask(task, `step_${i + 1}`, `Step ${i + 1}`),
          );
        }
    }

    // Determine if any subtasks can run in parallel
    if (task.type === TaskType.ANALYSIS && subtasks.length >= 2) {
      // Data collection and some processing can be parallel
      parallelGroups.push([subtasks[0].taskId, subtasks[1].taskId]);
    }

    return {
      originalTaskId: task.taskId,
      subtasks,
      parallelGroups,
    };
  }

  public async estimate(plan: AgentPlan<T>): Promise<number> {
    let totalEstimate = 0;

    if (plan.executionMode === ExecutionMode.SEQUENTIAL) {
      // Sum all task timeouts for sequential execution
      for (const task of plan.tasks) {
        totalEstimate += task.timeoutMs;
      }
    } else if (plan.executionMode === ExecutionMode.PARALLEL) {
      // Use maximum task timeout for parallel execution
      totalEstimate = Math.max(...plan.tasks.map((t) => t.timeoutMs));
    } else {
      // Mixed mode: calculate based on parallel groups and sequential tasks
      const parallelTaskIds = new Set(plan.parallelGroups.flat());
      const sequentialTasks = plan.tasks.filter(
        (t) => !parallelTaskIds.has(t.taskId),
      );

      // Add sequential tasks
      totalEstimate += sequentialTasks.reduce(
        (sum, task) => sum + task.timeoutMs,
        0,
      );

      // Add parallel groups (max timeout per group)
      for (const group of plan.parallelGroups) {
        const groupTasks = plan.tasks.filter((t) => group.includes(t.taskId));
        totalEstimate += Math.max(...groupTasks.map((t) => t.timeoutMs));
      }
    }

    // Add overhead for task switching and coordination (10%)
    return Math.ceil(totalEstimate * 1.1);
  }

  public async prioritize(tasks: AgentTask<T>[]): Promise<AgentTask<T>[]> {
    // Sort by priority, then by dependencies, then by creation time
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

    return [...tasks].sort((a, b) => {
      // First, sort by priority
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by dependency count (fewer dependencies first)
      if (a.dependencies.length !== b.dependencies.length) {
        return a.dependencies.length - b.dependencies.length;
      }

      // Finally by creation time (older first)
      return a.metrics.createdAt.getTime() - b.metrics.createdAt.getTime();
    });
  }

  public async merge(plans: AgentPlan<T>[]): Promise<AgentPlan<T>> {
    if (plans.length === 0) {
      throw new Error("Cannot merge empty plans array");
    }

    if (plans.length === 1) {
      return plans[0];
    }

    const basePlan = plans[0];
    const mergedTasks: AgentTask<T>[] = [];
    const mergedParallelGroups: string[][] = [];
    let totalEstimatedDuration = 0;

    // Collect all tasks from all plans
    for (const plan of plans) {
      mergedTasks.push(...plan.tasks);
      mergedParallelGroups.push(...plan.parallelGroups);
      totalEstimatedDuration += plan.metrics.estimatedDurationMs;
    }

    // Remove duplicate tasks (by taskId)
    const uniqueTasks = new Map<string, AgentTask<T>>();
    for (const task of mergedTasks) {
      uniqueTasks.set(task.taskId, task);
    }

    // Prioritize merged tasks
    const prioritizedTasks = await this.prioritize(
      Array.from(uniqueTasks.values()),
    );

    // Build new execution plan
    const { taskOrder } = this.buildExecutionPlan(
      prioritizedTasks,
      ExecutionMode.MIXED,
    );

    const mergedPlan = AgentPlanBuilder.create<T>()
      .planId(`merged_${randomUUID()}`)
      .agentId(basePlan.agentId)
      .workspaceId(basePlan.workspaceId)
      .requestId(basePlan.requestId)
      .traceId(basePlan.traceId)
      .name(`Merged Plan: ${plans.map((p) => p.name).join(", ")}`)
      .description(`Merged from ${plans.length} plans`)
      .state(PlanState.DRAFT)
      .priority(this.getHighestPriority(plans.map((p) => p.priority)))
      .executionMode(ExecutionMode.MIXED)
      .addTasks(prioritizedTasks)
      .setTaskOrder(taskOrder)
      .timeout(Math.max(...plans.map((p) => p.timeoutMs)))
      .maxConcurrency(Math.max(...plans.map((p) => p.maxConcurrency)))
      .estimatedDuration(totalEstimatedDuration)
      .metadata({
        mergedFrom: plans.map((p) => p.planId),
        mergedAt: new Date(),
      })
      .build();

    // Add merged parallel groups
    for (const group of mergedParallelGroups) {
      mergedPlan.parallelGroups.push(group);
    }

    return mergedPlan;
  }

  private buildExecutionPlan(
    tasks: AgentTask<T>[],
    executionMode?: ExecutionMode,
  ): { taskOrder: string[]; parallelGroups: string[][] } {
    const taskOrder: string[] = [];
    const parallelGroups: string[][] = [];

    if (executionMode === ExecutionMode.PARALLEL) {
      // All tasks can potentially run in parallel
      parallelGroups.push(tasks.map((t) => t.taskId));
    } else {
      // Build topological order based on dependencies
      taskOrder.push(...this.topologicalSort(tasks));
    }

    return { taskOrder, parallelGroups };
  }

  private topologicalSort(tasks: AgentTask<T>[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];
    const taskMap = new Map(tasks.map((t) => [t.taskId, t]));

    const visit = (taskId: string): void => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) {
        throw new Error("Circular dependency detected");
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId);
      if (task) {
        for (const dep of task.dependencies) {
          visit(dep.taskId);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
      result.push(taskId);
    };

    for (const task of tasks) {
      visit(task.taskId);
    }

    return result;
  }

  private hasCircularDependencies(tasks: AgentTask<T>[]): boolean {
    try {
      this.topologicalSort(tasks);
      return false;
    } catch {
      return true;
    }
  }

  private hasConflictingDependencies(tasks: AgentTask<T>[]): boolean {
    const taskIds = new Set(tasks.map((t) => t.taskId));

    for (const task of tasks) {
      for (const dep of task.dependencies) {
        if (taskIds.has(dep.taskId) && dep.type === "blocking") {
          return true; // Blocking dependency within parallel group
        }
      }
    }

    return false;
  }

  private createSubtask(
    parentTask: AgentTask<T>,
    suffix: string,
    name: string,
  ): AgentTask<T> {
    return AgentTaskBuilder.create<T>()
      .taskId(`${parentTask.taskId}_${suffix}`)
      .agentId(parentTask.agentId)
      .workspaceId(parentTask.workspaceId)
      .requestId(parentTask.requestId)
      .traceId(parentTask.traceId)
      .name(name)
      .description(`Subtask of ${parentTask.name}`)
      .type(parentTask.type)
      .state(TaskState.PENDING)
      .priority(parentTask.priority)
      .input(parentTask.input)
      .timeout(Math.ceil(parentTask.timeoutMs / 3)) // Divide timeout among subtasks
      .retryStrategy(parentTask.retryStrategy)
      .metadata({
        ...parentTask.metadata,
        parentTaskId: parentTask.taskId,
        subtask: true,
      })
      .build();
  }

  private getHighestPriority(priorities: AgentPriority[]): AgentPriority {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    const highestIndex = Math.min(
      ...priorities.map((p) => priorityOrder[p] ?? 2),
    );

    for (const [priority, index] of Object.entries(priorityOrder)) {
      if (index === highestIndex) {
        return priority as AgentPriority;
      }
    }

    return "normal" as AgentPriority;
  }
}
