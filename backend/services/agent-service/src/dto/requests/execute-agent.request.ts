export interface ExecuteAgentRequest {
  message: string;

  variables?: Record<string, unknown>;

  conversationId?: string;
}
