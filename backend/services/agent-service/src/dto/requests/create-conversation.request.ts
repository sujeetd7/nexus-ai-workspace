import { ConversationStatus } from "@generated/prisma";

export interface CreateConversationRequest {
  workspaceId: string;

  agentId: string;

  createdBy: string;

  title: string;

  status?: ConversationStatus;

  metadata?: Record<string, unknown>;
}
