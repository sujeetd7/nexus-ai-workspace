export interface CreateConversationDto {
  workspaceId: string;
  createdBy: string;
  title: string;
}

export interface CreateConversationMemberDto {
  conversationId: string;
  userId: string;
  role: "OWNER" | "MEMBER";
}

export interface CreateMessageDto {
  conversationId: string;
  senderId: string;
  type: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata?: any;
}

export interface CreateAttachmentDto {
  messageId: string;
  documentId: string;
  type: string;
}
