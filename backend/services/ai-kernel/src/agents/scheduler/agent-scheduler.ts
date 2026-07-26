import { AgentTask, TaskState } from "../planner/agent-task";
import { AgentPlan } from "../planner/agent-plan";

export interface SchedulerMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  uptime: number;
  throughput: number; // tasks per minute
}

export interface SchedulerHealth {
  status: "healthy" | "degraded" | "unhealthy";
  queueSizes: {
    priority: number;
    execution: number;
    waiting: number;
    completed: number;
    failed: number;
  };
  runningTasks: number;
  maxConcurrency: number;
  errors: string[];
  warnings: string[];
  lastActivity: Date;
}

export interface QueueSizes {
  priority: number;
  execution: number;
  waiting: number;
  completed: number;
  failed: number;
}

export interface RunningTaskInfo<T = unknown> {
  task: AgentTask<T>;
  startedAt: Date;
  timeoutAt: Date;
  attempts: number;
}

export enum SchedulingStrategy {
  PRIORITY = "priority",
  FIFO = "fifo",
  FAIR = "fair",
  DEPENDENCY = "dependency"
}

export interface IAgentScheduler<T = unknown> {
  schedule(task: AgentTask<T>): Promise<void>;
  enqueue(tasks: AgentTask<T>[]): Promise<void>;
  dequeue(): Promise<AgentTask<T> | undefined>;
  cancel(taskId: string): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reschedule(taskId: string, newPriority?: string): Promise<boolean>;
  health(): Promise<SchedulerHealth>;
  metrics(): Promise<SchedulerMetrics>;
  queueSizes(): Promise<QueueSizes>;
  runningTasks(): Promise<RunningTaskInfo<T>[]>;
}

export class AgentScheduler<T = unknown> implements IAgentScheduler<T> {
  private readonly priorityQueue: AgentTask<T>[] = [];
  private readonly executionQueue: AgentTask<T>[] = [];
  private readonly waitingQueue: AgentTask<T>[] = [];
  private readonly completedQueue: AgentTask<T>[] = [];
  private readonly failedQueue: AgentTask<T>[] = [];
  
  private readonly runningTasksMap: Map<string, RunningTaskInfo<T>> = new Map();
  private readonly taskDependencies: Map<string, Set<string>> = new Map();
  
  private readonly maxConcurrency: number;
  private readonly strategy: SchedulingStrategy;
  private readonly startTime: Date;
  
  private isPaused: boolean = false;
  private totalExecutionTime: number = 0;
  private completedCount: number = 0;
  private errors: string[] = [];
  private warnings: string[] = [];

  constructor(maxConcurrency: number = 5, strategy: SchedulingStrategy = SchedulingStrategy.PRIORITY) {
    this.maxConcurrency = maxConcurrency;
    this.strategy = strategy;
    this.startTime = new Date();
  }

  public async schedule(task: AgentTask<T>): Promise<void> {
    try {
      // Validate task
      if (!task.taskId) {
        throw new Error("Task must have a valid taskId");
      }

      // Check for duplicate task
      if (this.findTaskInQueues(task.taskId)) {
        throw new Error(`Task ${task.taskId} already scheduled`);
      }

      // Update task dependencies tracking
      this.updateDependencyTracking(task);

      // Determine initial queue placement
      if (this.canExecuteNow(task)) {
        this.addToPriorityQueue(task);
      } else {
        task.state = TaskState.WAITING;
        this.waitingQueue.push(task);
      }

    } catch (error) {
      const errorMsg = `Failed to schedule task ${task.taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async enqueue(tasks: AgentTask<T>[]): Promise<void> {
    for (const task of tasks) {
      await this.schedule(task);
    }
  }

  public async dequeue(): Promise<AgentTask<T> | undefined> {
    if (this.isPaused || this.runningTasksMap.size >= this.maxConcurrency) {
      return undefined;
    }

    // Move ready tasks from waiting queue to priority queue
    this.promoteWaitingTasks();

    // Get next task based on strategy
    let nextTask: AgentTask<T> | undefined;

    switch (this.strategy) {
      case SchedulingStrategy.PRIORITY:
        nextTask = this.dequeueByPriority();
        break;
      case SchedulingStrategy.FIFO:
        nextTask = this.dequeueByFIFO();
        break;
      case SchedulingStrategy.FAIR:
        nextTask = this.dequeueByFairness();
        break;
      case SchedulingStrategy.DEPENDENCY:
        nextTask = this.dequeueByDependency();
        break;
      default:
        nextTask = this.dequeueByPriority();
    }

    if (nextTask) {
      // Move to running state
      nextTask.state = TaskState.RUNNING;
      nextTask.metrics.startedAt = new Date();
      nextTask.metrics.attempts++;

      const runningInfo: RunningTaskInfo<T> = {
        task: nextTask,
        startedAt: new Date(),
        timeoutAt: new Date(Date.now() + nextTask.timeoutMs),
        attempts: nextTask.metrics.attempts
      };

      this.runningTasksMap.set(nextTask.taskId, runningInfo);
      this.executionQueue.push(nextTask);
    }

    return nextTask;
  }

  public async cancel(taskId: string): Promise<boolean> {
    try {
      // Check running tasks
      const runningInfo = this.runningTasksMap.get(taskId);
      if (runningInfo) {
        runningInfo.task.state = TaskState.CANCELLED;
        runningInfo.task.metrics.completedAt = new Date();
        this.runningTasksMap.delete(taskId);
        
        // Move to failed queue
        this.failedQueue.push(runningInfo.task);
        return true;
      }

      // Check other queues
      const task = this.removeTaskFromQueues(taskId);
      if (task) {
        task.state = TaskState.CANCELLED;
        task.metrics.completedAt = new Date();
        this.failedQueue.push(task);
        return true;
      }

      return false;
    } catch (error) {
      const errorMsg = `Failed to cancel task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async pause(): Promise<void> {
    this.isPaused = true;
  }

  public async resume(): Promise<void> {
    this.isPaused = false;
  }

  public async reschedule(taskId: string, newPriority?: string): Promise<boolean> {
    try {
      const task = this.findTaskInQueues(taskId);
      if (!task) {
        return false;
      }

      // Update priority if provided
      if (newPriority && ['critical', 'high', 'normal', 'low'].includes(newPriority)) {
        task.priority = newPriority as any;
      }

      // Remove from current queue and re-add
      this.removeTaskFromQueues(taskId);
      await this.schedule(task);
      
      return true;
    } catch (error) {
      const errorMsg = `Failed to reschedule task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async health(): Promise<SchedulerHealth> {
    const queueSizes = await this.queueSizes();
    const runningCount = this.runningTasksMap.size;
    
    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    
    if (this.errors.length > 0) {
      status = "unhealthy";
    } else if (this.warnings.length > 0 || runningCount === 0) {
      status = "degraded";
    }

    // Check for stale running tasks
    const now = new Date();
    for (const [taskId, info] of this.runningTasksMap.entries()) {
      if (now > info.timeoutAt) {
        this.warnings.push(`Task ${taskId} has exceeded timeout`);
        status = "degraded";
      }
    }

    return {
      status,
      queueSizes,
      runningTasks: runningCount,
      maxConcurrency: this.maxConcurrency,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastActivity: new Date()
    };
  }

  public async metrics(): Promise<SchedulerMetrics> {
    const uptime = Date.now() - this.startTime.getTime();
    const throughput = uptime > 0 ? (this.completedCount / (uptime / 60000)) : 0;
    const averageExecutionTime = this.completedCount > 0 ? this.totalExecutionTime / this.completedCount : 0;

    return {
      totalTasks: this.getTotalTaskCount(),
      completedTasks: this.completedQueue.length,
      failedTasks: this.failedQueue.length,
      cancelledTasks: this.failedQueue.filter(t => t.state === TaskState.CANCELLED).length,
      averageExecutionTime,
      totalExecutionTime: this.totalExecutionTime,
      uptime,
      throughput
    };
  }

  public async queueSizes(): Promise<QueueSizes> {
    return {
      priority: this.priorityQueue.length,
      execution: this.executionQueue.length,
      waiting: this.waitingQueue.length,
      completed: this.completedQueue.length,
      failed: this.failedQueue.length
    };
  }

  public async runningTasks(): Promise<RunningTaskInfo<T>[]> {
    return Array.from(this.runningTasksMap.values());
  }

  public async completeTask(taskId: string, success: boolean, output?: unknown, error?: string): Promise<void> {
    const runningInfo = this.runningTasksMap.get(taskId);
    if (!runningInfo) {
      return;
    }

    const task = runningInfo.task;
    const completedAt = new Date();
    const duration = completedAt.getTime() - runningInfo.startedAt.getTime();

    // Update task
    task.state = success ? TaskState.SUCCESS : TaskState.FAILED;
    task.output = output;
    task.error = error;
    task.metrics.completedAt = completedAt;
    task.metrics.duration = duration;

    // Update scheduler metrics
    this.totalExecutionTime += duration;
    if (success) {
      this.completedCount++;
    }

    // Remove from running and execution queues
    this.runningTasksMap.delete(taskId);
    const execIndex = this.executionQueue.findIndex(t => t.taskId === taskId);
    if (execIndex !== -1) {
      this.executionQueue.splice(execIndex, 1);
    }

    // Move to appropriate queue
    if (success) {
      this.completedQueue.push(task);
      // Check if this completion unblocks waiting tasks
      this.promoteWaitingTasks();
    } else {
      this.failedQueue.push(task);
    }
  }

  private addToPriorityQueue(task: AgentTask<T>): void {
    task.state = TaskState.READY;
    
    // Insert in priority order
    const priorityOrder = { 'critical': 0, 'high': 1, 'normal': 2, 'low': 3 };
    const taskPriority = priorityOrder[task.priority] ?? 2;
    
    let insertIndex = this.priorityQueue.length;
    for (let i = 0; i < this.priorityQueue.length; i++) {
      const existingPriority = priorityOrder[this.priorityQueue[i].priority] ?? 2;
      if (taskPriority < existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.priorityQueue.splice(insertIndex, 0, task);
  }

  private canExecuteNow(task: AgentTask<T>): boolean {
    // Check dependencies
    for (const dep of task.dependencies) {
      if (dep.type === "blocking") {
        const depTask = this.findTaskInQueues(dep.taskId);
        if (!depTask || depTask.state !== TaskState.SUCCESS) {
          return false;
        }
      }
    }
    return true;
  }

  private promoteWaitingTasks(): void {
    const toPromote: AgentTask<T>[] = [];
    
    for (let i = this.waitingQueue.length - 1; i >= 0; i--) {
      const task = this.waitingQueue[i];
      if (this.canExecuteNow(task)) {
        toPromote.push(task);
        this.waitingQueue.splice(i, 1);
      }
    }
    
    for (const task of toPromote) {
      this.addToPriorityQueue(task);
    }
  }

  private dequeueByPriority(): AgentTask<T> | undefined {
    return this.priorityQueue.shift();
  }

  private dequeueByFIFO(): AgentTask<T> | undefined {
    // Return oldest task regardless of priority
    if (this.priorityQueue.length === 0) return undefined;
    
    let oldestIndex = 0;
    let oldestTime = this.priorityQueue[0].metrics.createdAt.getTime();
    
    for (let i = 1; i < this.priorityQueue.length; i++) {
      const taskTime = this.priorityQueue[i].metrics.createdAt.getTime();
      if (taskTime < oldestTime) {
        oldestTime = taskTime;
        oldestIndex = i;
      }
    }
    
    return this.priorityQueue.splice(oldestIndex, 1)[0];
  }

  private dequeueByFairness(): AgentTask<T> | undefined {
    // Round-robin by agent
    if (this.priorityQueue.length === 0) return undefined;
    
    const agentCounts = new Map<string, number>();
    
    // Count running tasks per agent
    for (const info of this.runningTasksMap.values()) {
      const count = agentCounts.get(info.task.agentId) || 0;
      agentCounts.set(info.task.agentId, count + 1);
    }
    
    // Find task from agent with fewest running tasks
    let selectedIndex = 0;
    let minCount = agentCounts.get(this.priorityQueue[0].agentId) || 0;
    
    for (let i = 1; i < this.priorityQueue.length; i++) {
      const agentCount = agentCounts.get(this.priorityQueue[i].agentId) || 0;
      if (agentCount < minCount) {
        minCount = agentCount;
        selectedIndex = i;
      }
    }
    
    return this.priorityQueue.splice(selectedIndex, 1)[0];
  }

  private dequeueByDependency(): AgentTask<T> | undefined {
    // Find task with all dependencies satisfied and highest priority
    return this.dequeueByPriority(); // Dependencies already checked in canExecuteNow
  }

  private findTaskInQueues(taskId: string): AgentTask<T> | undefined {
    const allQueues = [
      this.priorityQueue,
      this.executionQueue,
      this.waitingQueue,
      this.completedQueue,
      this.failedQueue
    ];
    
    for (const queue of allQueues) {
      const task = queue.find(t => t.taskId === taskId);
      if (task) return task;
    }
    
    // Check running tasks
    const runningInfo = this.runningTasksMap.get(taskId);
    return runningInfo ? runningInfo.task : undefined;
  }

  private removeTaskFromQueues(taskId: string): AgentTask<T> | undefined {
    const allQueues = [
      this.priorityQueue,
      this.executionQueue,
      this.waitingQueue,
      this.completedQueue,
      this.failedQueue
    ];
    
    for (const queue of allQueues) {
      const index = queue.findIndex(t => t.taskId === taskId);
      if (index !== -1) {
        return queue.splice(index, 1)[0];
      }
    }
    
    return undefined;
  }

  private updateDependencyTracking(task: AgentTask<T>): void {
    const deps = new Set<string>();
    for (const dep of task.dependencies) {
      deps.add(dep.taskId);
    }
    this.taskDependencies.set(task.taskId, deps);
  }

  private getTotalTaskCount(): number {
    return this.priorityQueue.length +
           this.executionQueue.length +
           this.waitingQueue.length +
           this.completedQueue.length +
           this.failedQueue.length +
           this.runningTasksMap.size;
  }
}