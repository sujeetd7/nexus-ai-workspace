export interface ConversationMemberEntity {
  id: string;
  conversationId: string;
  userId: string;
  role: "OWNER" | "MEMBER";
  joinedAt: Date;
}
