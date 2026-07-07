export interface ConversationEntity {
  id: string;
  workspaceId: string;
  createdBy: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}
