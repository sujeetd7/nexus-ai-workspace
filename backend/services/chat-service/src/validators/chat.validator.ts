import { z } from "zod";

export const CreateConversationSchema = z.object({
  workspaceId: z.string().uuid(),
  createdBy: z.string().uuid(),
  title: z.string().min(3).max(100),
});

export const CreateMessageSchema = z.object({
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  type: z.enum(["USER", "ASSISTANT", "SYSTEM"]),
  content: z.string().min(1),
  metadata: z.any().optional(),
});
