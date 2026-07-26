export enum AgentStatus {
  IDLE = "idle",
  RUNNING = "running", 
  BUSY = "busy",
  PAUSED = "paused",
  STOPPED = "stopped",
  ERROR = "error",
  INITIALIZING = "initializing",
  SHUTTING_DOWN = "shutting_down"
}

export enum AgentLifecycleState {
  REGISTERED = "registered",
  INITIALIZING = "initializing",
  READY = "ready",
  RUNNING = "running",
  PAUSED = "paused",
  STOPPING = "stopping",
  STOPPED = "stopped",
  FAILED = "failed"
}

export enum AgentType {
  SYSTEM = "system",
  WORKFLOW = "workflow", 
  TASK = "task",
  SERVICE = "service",
  AUTONOMOUS = "autonomous",
  REACTIVE = "reactive",
  COLLABORATIVE = "collaborative"
}

export enum AgentPriority {
  LOW = "low",
  NORMAL = "normal", 
  HIGH = "high",
  CRITICAL = "critical"
}

export interface AgentExecutionResult {
  requestId: string;
  agentId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
  startTime: Date;
  endTime: Date;
  duration: number;
  tokensUsed?: number;
  cost?: number;
}

export interface AgentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  lastHeartbeat: Date;
  memoryUsage?: number;
  cpuUsage?: number;
  errors: string[];
  warnings: string[];
  metrics: Record<string, number>;
}

export enum ExecutionStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed",
  TIMEOUT = "timeout"
}

export interface ExecutionContext {
  requestId: string;
  traceId: string;
  workspaceId: string;
  userId: string;
  conversationId?: string;
  sessionId: string;
  metadata: Record<string, unknown>;
  startTime: Date;
  timeout?: number;
  cancellationToken?: AbortSignal;
}

export interface ExecutionResult {
  executionId: string;
  agentId: string;
  success: boolean;
  output?: unknown;
  startedAt: Date;
  finishedAt: Date;
  latency: number;
  usage?: {
    memoryUsed?: number;
    cpuTime?: number;
    tokensUsed?: number;
    cost?: number;
  };
  errors: string[];
  metadata: Record<string, unknown>;
  status: ExecutionStatus;
}

export interface ExecutionRequest {
  agentId: string;
  input: unknown;
  context: ExecutionContext;
  timeout?: number;
}

export interface BatchExecutionRequest {
  requests: ExecutionRequest[];
  maxConcurrency?: number;
  failFast?: boolean;
}

export interface BatchExecutionResult {
  batchId: string;
  results: ExecutionResult[];
  success: boolean;
  totalLatency: number;
  metadata: Record<string, unknown>;
}