import { WorkspaceRole } from "../types/enums/workspace-role.enum";

export interface AddMemberDto {
  workspaceId: string;

  userId: string;

  role: WorkspaceRole;
}
