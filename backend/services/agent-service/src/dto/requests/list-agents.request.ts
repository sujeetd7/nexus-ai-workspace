import { AgentStatus } from "../../generated/prisma";

export interface ListAgentsRequest {
  page?: number;

  limit?: number;

  workspaceId?: string;

  status?: AgentStatus;

  search?: string;
}
