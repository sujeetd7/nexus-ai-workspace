export interface EnhancedToolExecutionRequest {
  tool: string;
  input: any;
  requestId: string;

  // Enhanced context for MCP tools
  context?: {
    workspaceId?: string;
    userId?: string;
    traceId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  };

  // Execution options
  options?: {
    timeout?: number;
    retries?: number;
    cancellationToken?: AbortSignal;
  };
}
