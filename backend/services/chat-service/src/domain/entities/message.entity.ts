export interface MessageEntity {
  id: string;
  conversationId: string;
  senderId: string;
  type: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata?: any;
  createdAt: Date;
}
