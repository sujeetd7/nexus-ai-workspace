import { AgentStatus } from "../../generated/prisma";

export interface UpdateAgentRequest {
  name?: string;

  slug?: string;

  description?: string;

  systemPrompt?: string;

  provider?: string;

  model?: string;

  temperature?: number;

  maxTokens?: number;

  status?: AgentStatus;

  metadata?: Record<string, unknown>;
}
