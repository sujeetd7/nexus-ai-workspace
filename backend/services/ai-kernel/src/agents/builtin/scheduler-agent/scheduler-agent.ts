import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext,
} from "../../interfaces";
import {
  AgentType,
  AgentStatus,
  AgentPriority,
  AgentHealth,
  ExecutionResult,
  ExecutionStatus,
} from "../../types";
import {
  SchedulerOperation,
  SchedulerOperationRequest,
  ScheduleTaskRequest,
  EnqueueTasksRequest,
  DequeueTaskRequest,
  CancelTaskRequest,
  PauseSchedulerRequest,
  ResumeSchedulerRequest,
  GetMetricsRequest,
  SchedulerOperationResult,
  ScheduleTaskResult,
  EnqueueTasksResult,
  DequeueTaskResult,
  CancelTaskResult,
  PauseSchedulerResult,
  ResumeSchedulerResult,
  GetMetricsResult,
  SchedulerAgentHealth,
  SchedulerAgentMetrics,
} from "./scheduler-agent.types";
import {
  SchedulerAgentException,
  InvalidSchedulerOperationException,
  TaskSchedulingException,
  TaskEnqueueException,
  TaskDequeueException,
  TaskCancellationException,
  SchedulerControlException,
  SchedulerMetricsException,
  AgentSchedulerUnavailableException,
  InvalidTaskException,
  InvalidTasksArrayException,
} from "./scheduler-agent.exceptions";
import { IAgentScheduler } from "../../scheduler/agent-scheduler";
import { AgentTask } from "../../planner/agent-task";

export interface SchedulerAgentComponents {
  agentScheduler: IAgentScheduler;
}

export class SchedulerAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];

  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();

  // Scheduler components
  private readonly components: SchedulerAgentComponents;

  // Metrics
  private readonly operationCounts: Record<SchedulerOperation, number> =
    {} as Record<SchedulerOperation, number>;
  private readonly successCounts: Record<SchedulerOperation, number> =
    {} as Record<SchedulerOperation, number>;
  private readonly errorCounts: Record<SchedulerOperation, number> =
    {} as Record<SchedulerOperation, number>;
  private readonly latencies: Record<SchedulerOperation, number[]> =
    {} as Record<SchedulerOperation, number[]>;

  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  // Scheduling tracking
  private totalScheduled = 0;
  private totalEnqueued = 0;
  private totalDequeued = 0;
  private totalCancelled = 0;
  private totalPauses = 0;
  private totalResumes = 0;
  private totalTasksInEnqueue = 0;

  constructor(components: SchedulerAgentComponents) {
    this.metadata = {
      id: "scheduler-agent",
      name: "Scheduler Agent",
      description:
        "Built-in agent for task scheduling operations using the existing AgentScheduler infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["scheduler", "builtin", "task-management"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capabilities = [
      {
        id: "task-scheduling",
        name: "Task Scheduling",
        description:
          "Schedule individual tasks with priority and dependency management",
        inputSchema: { operation: "string", task: "object" },
        outputSchema: { success: "boolean", taskId: "string" },
        parameters: { timeout: 30000 },
        dependencies: [],
      },
      {
        id: "batch-enqueueing",
        name: "Batch Task Enqueueing",
        description:
          "Enqueue multiple tasks for batch processing with efficient queue management",
        inputSchema: { operation: "string", tasks: "array" },
        outputSchema: { success: "boolean", taskCount: "number" },
        parameters: { maxBatchSize: 100 },
        dependencies: [],
      },
      {
        id: "task-management",
        name: "Task Management",
        description:
          "Dequeue, cancel, and control task execution with state management",
        inputSchema: { operation: "string", taskId: "string" },
        outputSchema: { success: "boolean", task: "object" },
        parameters: {},
        dependencies: [],
      },
      {
        id: "scheduler-control",
        name: "Scheduler Control",
        description:
          "Control scheduler operation with pause, resume, and metrics capabilities",
        inputSchema: { operation: "string" },
        outputSchema: { success: "boolean", metrics: "object" },
        parameters: {},
        dependencies: [],
      },
    ];

    this.components = components;

    // Initialize metrics
    this.initializeMetrics();

    this.agentHealth = {
      status: "healthy",
      uptime: 0,
      lastHeartbeat: new Date(),
      memoryUsage: 0,
      cpuUsage: 0,
      errors: [],
      warnings: [],
      metrics: {},
    };
  }

  public get status(): AgentStatus {
    return this.agentStatus;
  }

  public get health(): AgentHealth {
    return this.agentHealth;
  }

  public async initialize(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.INITIALIZING;

      // Validate components
      if (!this.components.agentScheduler) {
        throw new AgentSchedulerUnavailableException();
      }

      this.agentStatus = AgentStatus.IDLE;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize scheduler agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new SchedulerAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;

      // Cleanup resources if needed
      // Agent scheduler doesn't require special cleanup

      this.agentStatus = AgentStatus.STOPPED;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown scheduler agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new SchedulerAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.agentScheduler) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      this.agentHealth = {
        status,
        uptime,
        lastHeartbeat: new Date(),
        memoryUsage: 0, // Placeholder
        cpuUsage: 0, // Placeholder
        errors: [...this.errors],
        warnings: [...this.warnings],
        metrics: {
          totalScheduled: this.totalScheduled,
          totalOperations: Object.values(this.operationCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
          successRate: this.calculateSuccessRate(),
        },
      };

      return this.agentHealth;
    } catch (error) {
      const errorMsg = `Failed to get scheduler agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        status: "unhealthy",
        uptime: Date.now() - this.startTime.getTime(),
        lastHeartbeat: new Date(),
        memoryUsage: 0,
        cpuUsage: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        metrics: { error: 1 },
      };
    }
  }

  public async updateStatus(status: AgentStatus): Promise<void> {
    this.agentStatus = status;
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.some((cap) => cap.id === capabilityId);
  }

  public getCapability(capabilityId: string): IAgentCapability | undefined {
    return this.capabilities.find((cap) => cap.id === capabilityId);
  }

  public listCapabilities(): IAgentCapability[] {
    return [...this.capabilities];
  }

  // Main execution method - determines which operation to execute based on input
  public async execute(
    input: unknown,
    context: IAgentExecutionContext,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.lastActivity = new Date();

    try {
      // Validate input
      const request = this.validateAndParseRequest(input);

      // Record operation attempt
      this.recordOperationAttempt(request.operation);

      // Execute operation
      let result: SchedulerOperationResult;

      switch (request.operation) {
        case SchedulerOperation.SCHEDULE:
          result = await this.scheduleTask(
            request as ScheduleTaskRequest,
            context,
          );
          break;
        case SchedulerOperation.ENQUEUE:
          result = await this.enqueueTasks(
            request as EnqueueTasksRequest,
            context,
          );
          break;
        case SchedulerOperation.DEQUEUE:
          result = await this.dequeueTask(
            request as DequeueTaskRequest,
            context,
          );
          break;
        case SchedulerOperation.CANCEL:
          result = await this.cancelTask(request as CancelTaskRequest, context);
          break;
        case SchedulerOperation.PAUSE:
          result = await this.pauseScheduler(
            request as PauseSchedulerRequest,
            context,
          );
          break;
        case SchedulerOperation.RESUME:
          result = await this.resumeScheduler(
            request as ResumeSchedulerRequest,
            context,
          );
          break;
        case SchedulerOperation.METRICS:
          result = await this.getSchedulerMetrics(
            request as GetMetricsRequest,
            context,
          );
          break;
        default:
          throw new InvalidSchedulerOperationException(
            request.operation as string,
            "Unsupported operation",
          );
      }

      // Record success
      const duration = Date.now() - startTime;
      this.recordOperationSuccess(request.operation, duration);

      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: result.success,
        output: result,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: result.error ? [result.error] : [],
        status: result.success
          ? ExecutionStatus.COMPLETED
          : ExecutionStatus.FAILED,
        metadata: {
          operation: request.operation,
          ...result.metadata,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown execution error";

      // Record error
      if (input && typeof input === "object" && "operation" in input) {
        this.recordOperationError(
          input.operation as SchedulerOperation,
          duration,
        );
      }

      this.errors.push(errorMsg);

      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: false,
        output: undefined,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: [errorMsg],
        status: ExecutionStatus.FAILED,
        metadata: { error: errorMsg },
      };
    }
  }

  // Individual scheduling operations
  public async scheduleTask(
    request: ScheduleTaskRequest,
    context: IAgentExecutionContext,
  ): Promise<ScheduleTaskResult> {
    const scheduledAt = new Date();

    try {
      // Validate task
      this.validateTask(request.task);

      // Schedule using existing scheduler
      await this.components.agentScheduler.schedule(request.task);

      this.totalScheduled++;

      return {
        success: true,
        operation: SchedulerOperation.SCHEDULE,
        taskId: request.task.taskId,
        scheduledAt,
        metadata: {
          taskId: request.task.taskId,
          agentId: request.task.agentId,
          priority: request.task.priority,
          state: request.task.state,
          timestamp: scheduledAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown task scheduling error";
      throw new TaskSchedulingException(request.task.taskId, errorMsg);
    }
  }

  public async enqueueTasks(
    request: EnqueueTasksRequest,
    context: IAgentExecutionContext,
  ): Promise<EnqueueTasksResult> {
    const enqueuedAt = new Date();

    try {
      // Validate tasks array
      this.validateTasksArray(request.tasks);

      // Enqueue using existing scheduler
      await this.components.agentScheduler.enqueue(request.tasks);

      this.totalEnqueued++;
      this.totalTasksInEnqueue += request.tasks.length;

      return {
        success: true,
        operation: SchedulerOperation.ENQUEUE,
        taskCount: request.tasks.length,
        enqueuedAt,
        metadata: {
          taskCount: request.tasks.length,
          taskIds: request.tasks.map((task) => task.taskId),
          timestamp: enqueuedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown task enqueue error";
      throw new TaskEnqueueException(request.tasks.length, errorMsg);
    }
  }

  public async dequeueTask(
    request: DequeueTaskRequest,
    context: IAgentExecutionContext,
  ): Promise<DequeueTaskResult> {
    const dequeuedAt = new Date();

    try {
      // Dequeue using existing scheduler
      const task = await this.components.agentScheduler.dequeue();

      if (task) {
        this.totalDequeued++;
      }

      return {
        success: true,
        operation: SchedulerOperation.DEQUEUE,
        task,
        hasTask: !!task,
        dequeuedAt,
        metadata: {
          hasTask: !!task,
          taskId: task?.taskId,
          agentId: task?.agentId,
          priority: task?.priority,
          timestamp: dequeuedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown task dequeue error";
      throw new TaskDequeueException(errorMsg);
    }
  }

  public async cancelTask(
    request: CancelTaskRequest,
    context: IAgentExecutionContext,
  ): Promise<CancelTaskResult> {
    const cancelledAt = new Date();

    try {
      // Cancel using existing scheduler
      const cancelled = await this.components.agentScheduler.cancel(
        request.taskId,
      );

      if (cancelled) {
        this.totalCancelled++;
      }

      return {
        success: true,
        operation: SchedulerOperation.CANCEL,
        taskId: request.taskId,
        cancelled,
        cancelledAt,
        metadata: {
          taskId: request.taskId,
          cancelled,
          timestamp: cancelledAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown task cancellation error";
      throw new TaskCancellationException(request.taskId, errorMsg);
    }
  }

  public async pauseScheduler(
    request: PauseSchedulerRequest,
    context: IAgentExecutionContext,
  ): Promise<PauseSchedulerResult> {
    const pausedAt = new Date();

    try {
      // Pause using existing scheduler
      await this.components.agentScheduler.pause();

      this.totalPauses++;

      return {
        success: true,
        operation: SchedulerOperation.PAUSE,
        paused: true,
        pausedAt,
        metadata: {
          timestamp: pausedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown scheduler pause error";
      throw new SchedulerControlException("pause", errorMsg);
    }
  }

  public async resumeScheduler(
    request: ResumeSchedulerRequest,
    context: IAgentExecutionContext,
  ): Promise<ResumeSchedulerResult> {
    const resumedAt = new Date();

    try {
      // Resume using existing scheduler
      await this.components.agentScheduler.resume();

      this.totalResumes++;

      return {
        success: true,
        operation: SchedulerOperation.RESUME,
        resumed: true,
        resumedAt,
        metadata: {
          timestamp: resumedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown scheduler resume error";
      throw new SchedulerControlException("resume", errorMsg);
    }
  }

  public async getSchedulerMetrics(
    request: GetMetricsRequest,
    context: IAgentExecutionContext,
  ): Promise<GetMetricsResult> {
    const retrievedAt = new Date();

    try {
      // Get metrics using existing scheduler
      const schedulerMetrics = await this.components.agentScheduler.metrics();

      return {
        success: true,
        operation: SchedulerOperation.METRICS,
        schedulerMetrics,
        retrievedAt,
        metadata: {
          totalTasks: schedulerMetrics.totalTasks,
          completedTasks: schedulerMetrics.completedTasks,
          failedTasks: schedulerMetrics.failedTasks,
          averageExecutionTime: schedulerMetrics.averageExecutionTime,
          throughput: schedulerMetrics.throughput,
          timestamp: retrievedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown scheduler metrics error";
      throw new SchedulerMetricsException(errorMsg);
    }
  }

  public async getSchedulerAgentHealth(): Promise<SchedulerAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.agentScheduler) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      // Get scheduler health for additional details
      let schedulerHealth;
      try {
        schedulerHealth = await this.components.agentScheduler.health();
      } catch {
        schedulerHealth = null;
      }

      // Get queue sizes
      let queueSizes;
      try {
        queueSizes = await this.components.agentScheduler.queueSizes();
      } catch {
        queueSizes = {
          priority: 0,
          execution: 0,
          waiting: 0,
          completed: 0,
          failed: 0,
        };
      }

      // Get metrics for task counts
      let metrics;
      try {
        metrics = await this.components.agentScheduler.metrics();
      } catch {
        metrics = null;
      }

      return {
        schedulerAvailable: !!this.components.agentScheduler,
        status,
        queueSizes,
        runningTasks: schedulerHealth?.runningTasks || 0,
        maxConcurrency: schedulerHealth?.maxConcurrency || 0,
        totalTasks: metrics?.totalTasks || 0,
        completedTasks: metrics?.completedTasks || 0,
        failedTasks: metrics?.failedTasks || 0,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          totalScheduled: this.totalScheduled,
          totalEnqueued: this.totalEnqueued,
          totalDequeued: this.totalDequeued,
          totalCancelled: this.totalCancelled,
          totalPauses: this.totalPauses,
          totalResumes: this.totalResumes,
          averageTasksPerEnqueue:
            this.totalEnqueued > 0
              ? this.totalTasksInEnqueue / this.totalEnqueued
              : 0,
          throughput: metrics?.throughput || 0,
          uptime: metrics?.uptime || 0,
        },
      };
    } catch (error) {
      const errorMsg = `Failed to get scheduler agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        schedulerAvailable: false,
        status: "unhealthy",
        queueSizes: {
          priority: 0,
          execution: 0,
          waiting: 0,
          completed: 0,
          failed: 0,
        },
        runningTasks: 0,
        maxConcurrency: 0,
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg },
      };
    }
  }

  public getMetrics(): SchedulerAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const successRate =
      totalOperations > 0 ? totalSuccesses / totalOperations : 0;

    // Calculate average latencies
    const averageLatencies: Record<SchedulerOperation, number> = {} as Record<
      SchedulerOperation,
      number
    >;
    Object.keys(this.latencies).forEach((op) => {
      const operation = op as SchedulerOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;
    });

    // Default values for metrics (since this is a sync method and scheduler methods are async)
    // In a real implementation, you might want to cache these values from async calls
    const defaultMetrics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      uptime: Date.now() - this.startTime.getTime(),
      throughput: 0,
    };

    const queueSizes = {
      priority: 0,
      execution: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
    };

    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      schedulingStats: {
        totalScheduled: this.totalScheduled,
        totalEnqueued: this.totalEnqueued,
        totalDequeued: this.totalDequeued,
        totalCancelled: this.totalCancelled,
        totalPauses: this.totalPauses,
        totalResumes: this.totalResumes,
        averageTasksPerEnqueue:
          this.totalEnqueued > 0
            ? this.totalTasksInEnqueue / this.totalEnqueued
            : 0,
        schedulingSuccessRate: this.calculateOperationSuccessRate(
          SchedulerOperation.SCHEDULE,
        ),
        cancellationSuccessRate: this.calculateOperationSuccessRate(
          SchedulerOperation.CANCEL,
        ),
        dequeuingSuccessRate: this.calculateOperationSuccessRate(
          SchedulerOperation.DEQUEUE,
        ),
      },
      taskStats: {
        totalTasks: defaultMetrics.totalTasks,
        completedTasks: defaultMetrics.completedTasks,
        failedTasks: defaultMetrics.failedTasks,
        cancelledTasks: defaultMetrics.cancelledTasks,
        runningTasks: 0, // Would need to get from runningTasks() method
        averageExecutionTime: defaultMetrics.averageExecutionTime,
        totalExecutionTime: defaultMetrics.totalExecutionTime,
        throughput: defaultMetrics.throughput,
        queueUtilization: {
          priorityQueue: queueSizes.priority,
          executionQueue: queueSizes.execution,
          waitingQueue: queueSizes.waiting,
          completedQueue: queueSizes.completed,
          failedQueue: queueSizes.failed,
        },
      },
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): SchedulerOperationRequest {
    if (!input || typeof input !== "object") {
      throw new InvalidSchedulerOperationException(
        "unknown",
        "Input must be an object",
      );
    }

    const request = input as Record<string, unknown>;

    if (!request.operation || typeof request.operation !== "string") {
      throw new InvalidSchedulerOperationException(
        "unknown",
        "Operation is required and must be a string",
      );
    }

    if (
      !Object.values(SchedulerOperation).includes(
        request.operation as SchedulerOperation,
      )
    ) {
      throw new InvalidSchedulerOperationException(
        request.operation as string,
        "Unsupported operation",
      );
    }

    // Validate operation-specific requirements
    const operation = request.operation as SchedulerOperation;

    if (operation === SchedulerOperation.SCHEDULE) {
      if (!request.task || typeof request.task !== "object") {
        throw new InvalidSchedulerOperationException(
          operation,
          "Task is required for schedule operation",
        );
      }
    }

    if (operation === SchedulerOperation.ENQUEUE) {
      if (!Array.isArray(request.tasks)) {
        throw new InvalidSchedulerOperationException(
          operation,
          "Tasks array is required for enqueue operation",
        );
      }
    }

    if (operation === SchedulerOperation.CANCEL) {
      if (!request.taskId || typeof request.taskId !== "string") {
        throw new InvalidSchedulerOperationException(
          operation,
          "Task ID is required for cancel operation",
        );
      }
    }

    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request,
    } as SchedulerOperationRequest;
  }

  private validateTask(task: AgentTask): void {
    const requiredFields = ["taskId", "agentId", "input", "priority", "state"];
    const missingFields = requiredFields.filter(
      (field) =>
        !(field in task) || task[field as keyof AgentTask] === undefined,
    );

    if (missingFields.length > 0) {
      throw new InvalidTaskException(missingFields);
    }

    // Validate task ID format
    if (typeof task.taskId !== "string" || task.taskId.length === 0) {
      throw new InvalidTaskException(["taskId (must be non-empty string)"]);
    }

    // Validate agent ID
    if (typeof task.agentId !== "string" || task.agentId.length === 0) {
      throw new InvalidTaskException(["agentId (must be non-empty string)"]);
    }
  }

  private validateTasksArray(tasks: AgentTask[]): void {
    if (!Array.isArray(tasks)) {
      throw new InvalidTasksArrayException("Tasks must be an array");
    }

    if (tasks.length === 0) {
      throw new InvalidTasksArrayException("Tasks array must not be empty");
    }

    // Validate each task
    tasks.forEach((task, index) => {
      try {
        this.validateTask(task);
      } catch (error) {
        throw new InvalidTasksArrayException(
          `Invalid task at index ${index}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });

    // Check for duplicate task IDs
    const taskIds = tasks.map((task) => task.taskId);
    const uniqueIds = new Set(taskIds);
    if (uniqueIds.size !== taskIds.length) {
      throw new InvalidTasksArrayException(
        "Duplicate task IDs found in tasks array",
      );
    }
  }

  private initializeMetrics(): void {
    Object.values(SchedulerOperation).forEach((operation) => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: SchedulerOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(
    operation: SchedulerOperation,
    duration: number,
  ): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(
    operation: SchedulerOperation,
    duration: number,
  ): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }

  private calculateOperationSuccessRate(operation: SchedulerOperation): number {
    const totalOps = this.operationCounts[operation];
    const successOps = this.successCounts[operation];
    return totalOps > 0 ? successOps / totalOps : 0;
  }
}
