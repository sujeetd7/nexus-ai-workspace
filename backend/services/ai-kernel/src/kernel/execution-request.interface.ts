export interface IKernelExecutionRequest {
  requestId?: string;

  prompt: string;

  userId?: string;

  workspaceId?: string;

  agentId?: string;

  conversationId?: string;

  provider?: string;

  model?: string;

  temperature?: number;

  stream?: boolean;

  maxTokens?: number;

  tools?: string[];

  metadata?: Record<string, unknown>;
}
