export interface MCPExecutionContext {
  requestId: string;
  workspaceId: string;
  userId: string;
  traceId: string;
  sessionId: string;
  metadata?: {
    startTime: Date;
    source: string;
    parentRequestId?: string;
    timeout?: number;
    retryAttempt?: number;
    [key: string]: unknown;
  };
}

export interface MCPExecutionOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cancellationToken?: AbortSignal;
  parallel?: boolean;
}

export interface MCPExecutionRequest {
  context: MCPExecutionContext;
  serverId: string;
  toolName: string;
  parameters: any;
  options?: MCPExecutionOptions;
}

export interface MCPExecutionResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
  metadata: {
    executionId: string;
    serverId: string;
    toolName: string;
    requestId: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    retryAttempt: number;
    cached: boolean;
  };
}

export interface MCPBatchExecutionRequest {
  context: MCPExecutionContext;
  requests: Array<{
    serverId: string;
    toolName: string;
    parameters: any;
    options?: MCPExecutionOptions;
  }>;
  options?: {
    parallel?: boolean;
    continueOnError?: boolean;
    maxConcurrency?: number;
  };
}

export interface MCPBatchExecutionResult {
  success: boolean;
  results: MCPExecutionResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
  };
}

export class ExecutionContextBuilder {
  private context: Partial<MCPExecutionContext> = {};

  static create(): ExecutionContextBuilder {
    return new ExecutionContextBuilder();
  }

  requestId(requestId: string): ExecutionContextBuilder {
    this.context.requestId = requestId;
    return this;
  }

  workspaceId(workspaceId: string): ExecutionContextBuilder {
    this.context.workspaceId = workspaceId;
    return this;
  }

  userId(userId: string): ExecutionContextBuilder {
    this.context.userId = userId;
    return this;
  }

  traceId(traceId: string): ExecutionContextBuilder {
    this.context.traceId = traceId;
    return this;
  }

  sessionId(sessionId: string): ExecutionContextBuilder {
    this.context.sessionId = sessionId;
    return this;
  }

  metadata(metadata: Record<string, unknown>): ExecutionContextBuilder {
    this.context.metadata = {
      startTime: new Date(),
      source: "mcp-runtime",
      ...this.context.metadata,
      ...metadata
    };
    return this;
  }

  timeout(timeout: number): ExecutionContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = {
        startTime: new Date(),
        source: "mcp-runtime"
      };
    }
    this.context.metadata.timeout = timeout;
    return this;
  }

  source(source: string): ExecutionContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = {
        startTime: new Date(),
        source: "mcp-runtime"
      };
    }
    this.context.metadata.source = source;
    return this;
  }

  parentRequestId(parentRequestId: string): ExecutionContextBuilder {
    if (!this.context.metadata) {
      this.context.metadata = {
        startTime: new Date(),
        source: "mcp-runtime"
      };
    }
    this.context.metadata.parentRequestId = parentRequestId;
    return this;
  }

  build(): MCPExecutionContext {
    if (!this.context.requestId) {
      throw new Error("requestId is required");
    }
    if (!this.context.workspaceId) {
      throw new Error("workspaceId is required");
    }
    if (!this.context.userId) {
      throw new Error("userId is required");
    }
    if (!this.context.traceId) {
      throw new Error("traceId is required");
    }
    if (!this.context.sessionId) {
      throw new Error("sessionId is required");
    }

    return {
      ...this.context,
      metadata: {
        startTime: new Date(),
        source: "mcp-runtime",
        ...this.context.metadata
      }
    } as MCPExecutionContext;
  }
}

export function generateExecutionId(context: MCPExecutionContext, toolName: string): string {
  return `exec_${context.requestId}_${toolName}_${Date.now()}`;
}

export function isRetryableError(error: any): boolean {
  if (!error) return false;
  
  // Network/transport errors are retryable
  if (error.code === "ECONNREFUSED" || 
      error.code === "ENOTFOUND" || 
      error.code === "ETIMEDOUT" ||
      error.code === "ECONNRESET") {
    return true;
  }

  // MCP specific retryable errors
  if (error.message && typeof error.message === "string") {
    const message = error.message.toLowerCase();
    return message.includes("timeout") ||
           message.includes("connection") ||
           message.includes("network") ||
           message.includes("transport");
  }

  return false;
}