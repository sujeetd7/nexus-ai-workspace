export interface WorkspaceEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}
