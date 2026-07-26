export interface PromptEntity {
  id: string;

  workspaceId: string;

  createdBy: string;

  name: string;

  description?: string;

  category?: string;

  isPublic: boolean;

  createdAt: Date;

  updatedAt: Date;
}
