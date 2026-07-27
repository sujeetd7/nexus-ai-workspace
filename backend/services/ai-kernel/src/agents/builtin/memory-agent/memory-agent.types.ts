export enum MemoryOperation {
  LOAD_CONVERSATION = "load_conversation",
  SAVE_CONVERSATION = "save_conversation",
  LOAD_WORKSPACE = "load_workspace",
  SAVE_WORKSPACE = "save_workspace",
  LOAD_SHARED = "load_shared",
  SAVE_SHARED = "save_shared",
  LOAD_SCRATCHPAD = "load_scratchpad",
  SAVE_SCRATCHPAD = "save_scratchpad",
  SUMMARY = "summary",
  CLEAR = "clear",
}

export enum MemoryType {
  CONVERSATION = "conversation",
  WORKSPACE = "workspace",
  SCRATCHPAD = "scratchpad",
  SHARED = "shared",
}

export interface MemoryOperationRequest {
  operation: MemoryOperation;
  type?: MemoryType;
  key?: string;
  value?: unknown;
  metadata?: Record<string, unknown>;
}

export interface MemoryLoadRequest extends MemoryOperationRequest {
  operation:
    | MemoryOperation.LOAD_CONVERSATION
    | MemoryOperation.LOAD_WORKSPACE
    | MemoryOperation.LOAD_SHARED
    | MemoryOperation.LOAD_SCRATCHPAD;
  key: string;
}

export interface MemorySaveRequest extends MemoryOperationRequest {
  operation:
    | MemoryOperation.SAVE_CONVERSATION
    | MemoryOperation.SAVE_WORKSPACE
    | MemoryOperation.SAVE_SHARED
    | MemoryOperation.SAVE_SCRATCHPAD;
  key: string;
  value: unknown;
}

export interface MemorySummaryRequest extends MemoryOperationRequest {
  operation: MemoryOperation.SUMMARY;
  type: MemoryType;
  conversationId?: string;
  workspaceId?: string;
  maxItems?: number;
}

export interface MemoryClearRequest extends MemoryOperationRequest {
  operation: MemoryOperation.CLEAR;
  type: MemoryType;
  conversationId?: string;
  workspaceId?: string;
}

export interface MemoryOperationResult {
  success: boolean;
  operation: MemoryOperation;
  type?: MemoryType;
  key?: string;
  value?: unknown;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface MemoryLoadResult extends MemoryOperationResult {
  operation:
    | MemoryOperation.LOAD_CONVERSATION
    | MemoryOperation.LOAD_WORKSPACE
    | MemoryOperation.LOAD_SHARED
    | MemoryOperation.LOAD_SCRATCHPAD;
  found: boolean;
  value?: unknown;
}

export interface MemorySaveResult extends MemoryOperationResult {
  operation:
    | MemoryOperation.SAVE_CONVERSATION
    | MemoryOperation.SAVE_WORKSPACE
    | MemoryOperation.SAVE_SHARED
    | MemoryOperation.SAVE_SCRATCHPAD;
  saved: boolean;
  previousValue?: unknown;
}

export interface MemorySummaryResult extends MemoryOperationResult {
  operation: MemoryOperation.SUMMARY;
  type: MemoryType;
  summary?: string;
  itemCount?: number;
  summaryAvailable: boolean;
}

export interface MemoryClearResult extends MemoryOperationResult {
  operation: MemoryOperation.CLEAR;
  type: MemoryType;
  cleared: boolean;
  itemsCleared?: number;
}

export interface MemoryAgentHealth {
  memoryAvailable: boolean;
  provider: string;
  cacheSize: {
    conversation: number;
    workspace: number;
    scratchpad: number;
    shared: number;
  };
  status: "healthy" | "degraded" | "unhealthy";
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface MemoryAgentMetrics {
  operationCounts: Record<MemoryOperation, number>;
  successCounts: Record<MemoryOperation, number>;
  errorCounts: Record<MemoryOperation, number>;
  averageResponseTimes: Record<MemoryOperation, number>;
  totalOperations: number;
  successRate: number;
  uptime: number;
  memoryUsage: {
    conversation: number;
    workspace: number;
    scratchpad: number;
    shared: number;
    total: number;
  };
}
