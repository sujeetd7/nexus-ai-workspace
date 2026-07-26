import { ExecutionResult } from "../types";

export enum CoordinationStrategy {
  PARALLEL = "parallel",
  MAJORITY_VOTING = "majority_voting",
  FIRST_SUCCESS = "first_success",
  ALL_SUCCESS = "all_success",
  QUORUM = "quorum",
  SEQUENTIAL = "sequential"
}

export enum CoordinationStatus {
  PENDING = "pending",
  ASSIGNED = "assigned",
  DELEGATED = "delegated",
  RUNNING = "running",
  COLLECTING = "collecting",
  SUCCESS = "success",
  FAILED = "failed",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled"
}

export enum VotingMethod {
  SIMPLE_MAJORITY = "simple_majority",
  WEIGHTED_MAJORITY = "weighted_majority",
  UNANIMOUS = "unanimous",
  SUPER_MAJORITY = "super_majority"
}

export interface AgentAssignment {
  agentId: string;
  taskId: string;
  assignedAt: Date;
  input: unknown;
  priority: number;
  weight?: number;
  timeout?: number;
  metadata: Record<string, unknown>;
}

export interface CoordinationTask {
  taskId: string;
  coordinationId: string;
  strategy: CoordinationStrategy;
  assignments: AgentAssignment[];
  
  // Strategy-specific configuration
  quorumSize?: number;
  votingMethod?: VotingMethod;
  weightThreshold?: number;
  maxParallelism?: number;
  
  // Execution tracking
  status: CoordinationStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Results
  results: Record<string, ExecutionResult>;
  finalResult?: unknown;
  votes?: Record<string, unknown>;
  
  // Control
  timeoutMs?: number;
  cancellationToken?: AbortSignal;
  retryAttempts?: number;
  
  metadata: Record<string, unknown>;
}

export interface CoordinationContext {
  coordinationId: string;
  requestId: string;
  traceId: string;
  workspaceId: string;
  userId: string;
  conversationId?: string;
  executionId: string;
  
  startTime: Date;
  timeout?: number;
  cancellationToken?: AbortSignal;
  
  metadata: Record<string, unknown>;
}

export interface CoordinationRequest {
  agentIds: string[];
  input: unknown;
  strategy: CoordinationStrategy;
  context: CoordinationContext;
  
  // Strategy-specific options
  quorumSize?: number;
  votingMethod?: VotingMethod;
  weightThreshold?: number;
  maxParallelism?: number;
  
  // Agent-specific options
  agentWeights?: Record<string, number>;
  agentTimeouts?: Record<string, number>;
  agentPriorities?: Record<string, number>;
  
  // Execution options
  timeoutMs?: number;
  retryAttempts?: number;
  failFast?: boolean;
  collectPartialResults?: boolean;
  
  metadata: Record<string, unknown>;
}

export interface CoordinationResult {
  coordinationId: string;
  taskId: string;
  status: CoordinationStatus;
  strategy: CoordinationStrategy;
  
  // Results
  finalResult?: unknown;
  agentResults: Record<string, ExecutionResult>;
  successfulAgents: string[];
  failedAgents: string[];
  
  // Voting results (if applicable)
  votes?: Record<string, unknown>;
  winningVote?: unknown;
  voteDistribution?: Record<string, number>;
  
  // Performance metrics
  startedAt: Date;
  completedAt: Date;
  duration: number;
  agentCount: number;
  successCount: number;
  failureCount: number;
  
  // Error tracking
  errors: string[];
  warnings: string[];
  
  metadata: Record<string, unknown>;
}

export interface HandoffRequest {
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  context: Record<string, unknown>;
  input: unknown;
  reason?: string;
  priority?: number;
  timeout?: number;
  metadata: Record<string, unknown>;
}

export interface HandoffResult {
  handoffId: string;
  fromAgentId: string;
  toAgentId: string;
  taskId: string;
  success: boolean;
  handoffAt: Date;
  completedAt?: Date;
  result?: ExecutionResult;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface BroadcastRequest {
  agentIds: string[];
  message: unknown;
  context: CoordinationContext;
  requireAcknowledgment?: boolean;
  timeout?: number;
  metadata: Record<string, unknown>;
}

export interface BroadcastResult {
  broadcastId: string;
  agentIds: string[];
  acknowledgedAgents: string[];
  failedAgents: string[];
  broadcastAt: Date;
  completedAt: Date;
  success: boolean;
  errors: string[];
  metadata: Record<string, unknown>;
}

export interface CoordinatorHealth {
  status: "healthy" | "degraded" | "unhealthy";
  activeCoordinations: number;
  completedCoordinations: number;
  failedCoordinations: number;
  averageCoordinationTime: number;
  
  // Strategy statistics
  strategyStats: Record<CoordinationStrategy, {
    count: number;
    successRate: number;
    averageTime: number;
  }>;
  
  // Agent statistics
  agentStats: Record<string, {
    assignments: number;
    successes: number;
    failures: number;
    averageTime: number;
  }>;
  
  // Resource usage
  memoryUsage: number;
  queueSize: number;
  
  errors: string[];
  warnings: string[];
  lastActivity: Date;
  uptime: number;
  
  metadata: Record<string, unknown>;
}