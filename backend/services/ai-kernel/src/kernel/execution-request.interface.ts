export interface IKernelExecutionRequest {
  requestId?: string;
  prompt: string;
  userId?: string;
  workspaceId?: string;
  agentId?: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
  // Add other properties as needed, like `providerConfig`, `modelConfig`, `tools` etc.
}
