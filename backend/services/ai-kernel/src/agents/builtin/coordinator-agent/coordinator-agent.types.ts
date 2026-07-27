import {
  CoordinationRequest,
  CoordinationResult,
  HandoffRequest,
  HandoffResult,
  BroadcastRequest,
  BroadcastResult,
  CoordinationContext,
} from "../../coordinator";

export enum CoordinatorOperation {
  ASSIGN = "assign",
  DELEGATE = "delegate",
  HANDOFF = "handoff",
  BROADCAST = "broadcast",
  COLLECT = "collect",
  CANCEL = "cancel",
}

export interface CoordinatorOperationRequest {
  operation: CoordinatorOperation;
  metadata?: Record<string, unknown>;
}

export interface CoordinatorAssignRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.ASSIGN;
  coordinationRequest: CoordinationRequest;
}

export interface CoordinatorDelegateRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.DELEGATE;
  agentId: string;
  task: unknown;
  context: CoordinationContext;
}

export interface CoordinatorHandoffRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.HANDOFF;
  handoffRequest: HandoffRequest;
}

export interface CoordinatorBroadcastRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.BROADCAST;
  broadcastRequest: BroadcastRequest;
}

export interface CoordinatorCollectRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.COLLECT;
  coordinationId: string;
}

export interface CoordinatorCancelRequest extends CoordinatorOperationRequest {
  operation: CoordinatorOperation.CANCEL;
  coordinationId: string;
}

export interface CoordinatorOperationResult {
  success: boolean;
  operation: CoordinatorOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface CoordinatorAssignResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.ASSIGN;
  coordinationId: string;
  agentCount: number;
  result?: CoordinationResult;
  assignedAt: Date;
}

export interface CoordinatorDelegateResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.DELEGATE;
  agentId: string;
  executionId: string;
  delegatedAt: Date;
}

export interface CoordinatorHandoffResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.HANDOFF;
  fromAgentId: string;
  toAgentId: string;
  result?: HandoffResult;
  handedOffAt: Date;
}

export interface CoordinatorBroadcastResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.BROADCAST;
  recipientCount: number;
  result?: BroadcastResult;
  broadcastAt: Date;
}

export interface CoordinatorCollectResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.COLLECT;
  coordinationId: string;
  result?: CoordinationResult;
  collectedAt: Date;
}

export interface CoordinatorCancelResult extends CoordinatorOperationResult {
  operation: CoordinatorOperation.CANCEL;
  coordinationId: string;
  cancelled: boolean;
  cancelledAt: Date;
}

export interface CoordinatorAgentHealth {
  coordinatorAvailable: boolean;
  agentRegistryAvailable: boolean;
  runtimeAvailable: boolean;
  communicationAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  totalCoordinations: number;
  activeCoordinations: number;
  completedCoordinations: number;
  failedCoordinations: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface CoordinatorAgentMetrics {
  operationCounts: Record<CoordinatorOperation, number>;
  successCounts: Record<CoordinatorOperation, number>;
  errorCounts: Record<CoordinatorOperation, number>;
  averageLatencies: Record<CoordinatorOperation, number>;

  totalOperations: number;
  successRate: number;
  uptime: number;

  coordinationStats: {
    totalCoordinations: number;
    parallelCoordinations: number;
    sequentialCoordinations: number;
    votingCoordinations: number;
    quorumCoordinations: number;
    averageCoordinationTime: number;
    successfulCoordinations: number;
    failedCoordinations: number;
    timedOutCoordinations: number;
    cancelledCoordinations: number;
  };

  operationStats: {
    totalDelegations: number;
    totalHandoffs: number;
    totalBroadcasts: number;
    totalCollections: number;
    totalCancellations: number;
    averageAgentsPerCoordination: number;
    delegationSuccessRate: number;
    handoffSuccessRate: number;
    broadcastSuccessRate: number;
  };
}
