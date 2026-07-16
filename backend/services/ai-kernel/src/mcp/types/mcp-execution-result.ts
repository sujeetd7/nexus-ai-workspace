export interface MCPExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime: number;
    serverId: string;
    toolName: string;
    timestamp: Date;
  };
}