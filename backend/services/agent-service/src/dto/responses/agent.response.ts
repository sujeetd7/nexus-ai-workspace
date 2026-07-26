import { AgentStatus } from "../../generated/prisma";

export interface AgentResponse {
  id: string;

  workspaceId: string;

  name: string;

  slug: string;

  description: string | null;

  systemPrompt: string | null;

  provider: string;

  model: string;

  temperature: number;

  maxTokens: number;

  status: AgentStatus;

  metadata: Record<string, unknown> | null;

  createdAt: Date;

  updatedAt: Date;
}
