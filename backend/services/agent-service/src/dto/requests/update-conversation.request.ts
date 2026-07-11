import { ConversationStatus } from "@generated/prisma";

export interface UpdateConversationRequest {
  title?: string;

  status?: ConversationStatus;

  metadata?: Record<string, unknown>;
}
