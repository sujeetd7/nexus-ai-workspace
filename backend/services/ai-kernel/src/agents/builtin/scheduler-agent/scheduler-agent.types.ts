import { AgentTask } from "../../planner/agent-task";
import {
  SchedulerMetrics,
  SchedulerHealth,
  QueueSizes,
  RunningTaskInfo,
} from "../../scheduler/agent-scheduler";

export enum SchedulerOperation {
  SCHEDULE = "schedule",
  ENQUEUE = "enqueue",
  DEQUEUE = "dequeue",
  CANCEL = "cancel",
  PAUSE = "pause",
  RESUME = "resume",
  METRICS = "metrics",
}

export interface SchedulerOperationRequest {
  operation: SchedulerOperation;
  metadata?: Record<string, unknown>;
}

export interface ScheduleTaskRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.SCHEDULE;
  task: AgentTask;
}

export interface EnqueueTasksRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.ENQUEUE;
  tasks: AgentTask[];
}

export interface DequeueTaskRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.DEQUEUE;
}

export interface CancelTaskRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.CANCEL;
  taskId: string;
}

export interface PauseSchedulerRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.PAUSE;
}

export interface ResumeSchedulerRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.RESUME;
}

export interface GetMetricsRequest extends SchedulerOperationRequest {
  operation: SchedulerOperation.METRICS;
}

export interface SchedulerOperationResult {
  success: boolean;
  operation: SchedulerOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface ScheduleTaskResult extends SchedulerOperationResult {
  operation: SchedulerOperation.SCHEDULE;
  taskId: string;
  scheduledAt: Date;
}

export interface EnqueueTasksResult extends SchedulerOperationResult {
  operation: SchedulerOperation.ENQUEUE;
  taskCount: number;
  enqueuedAt: Date;
}

export interface DequeueTaskResult extends SchedulerOperationResult {
  operation: SchedulerOperation.DEQUEUE;
  task?: AgentTask;
  hasTask: boolean;
  dequeuedAt: Date;
}

export interface CancelTaskResult extends SchedulerOperationResult {
  operation: SchedulerOperation.CANCEL;
  taskId: string;
  cancelled: boolean;
  cancelledAt: Date;
}

export interface PauseSchedulerResult extends SchedulerOperationResult {
  operation: SchedulerOperation.PAUSE;
  paused: boolean;
  pausedAt: Date;
}

export interface ResumeSchedulerResult extends SchedulerOperationResult {
  operation: SchedulerOperation.RESUME;
  resumed: boolean;
  resumedAt: Date;
}

export interface GetMetricsResult extends SchedulerOperationResult {
  operation: SchedulerOperation.METRICS;
  schedulerMetrics: SchedulerMetrics;
  retrievedAt: Date;
}

export interface SchedulerAgentHealth {
  schedulerAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  queueSizes: QueueSizes;
  runningTasks: number;
  maxConcurrency: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface SchedulerAgentMetrics {
  operationCounts: Record<SchedulerOperation, number>;
  successCounts: Record<SchedulerOperation, number>;
  errorCounts: Record<SchedulerOperation, number>;
  averageLatencies: Record<SchedulerOperation, number>;

  totalOperations: number;
  successRate: number;
  uptime: number;

  schedulingStats: {
    totalScheduled: number;
    totalEnqueued: number;
    totalDequeued: number;
    totalCancelled: number;
    totalPauses: number;
    totalResumes: number;
    averageTasksPerEnqueue: number;
    schedulingSuccessRate: number;
    cancellationSuccessRate: number;
    dequeuingSuccessRate: number;
  };

  taskStats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    cancelledTasks: number;
    runningTasks: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    throughput: number;
    queueUtilization: {
      priorityQueue: number;
      executionQueue: number;
      waitingQueue: number;
      completedQueue: number;
      failedQueue: number;
    };
  };
}
