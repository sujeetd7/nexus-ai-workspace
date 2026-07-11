import { ConversationStatus } from "@generated/prisma";

export interface ListConversationsRequest {
  page?: number;

  limit?: number;

  workspaceId?: string;

  agentId?: string;

  status?: ConversationStatus;

  search?: string;
}
