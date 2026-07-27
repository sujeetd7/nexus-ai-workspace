import { AgentType, AgentStatus, AgentPriority, AgentHealth } from "../types";

export interface IAgentMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgentCapability {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  parameters: Record<string, unknown>;
  dependencies: string[];
}

export interface IAgentExecutionContext {
  requestId: string;
  traceId: string;
  workspaceId: string;
  userId: string;
  sessionId: string;
  conversationId?: string;
  metadata: Record<string, unknown>;
  startTime: Date;
  timeout?: number;
  cancellationToken?: AbortSignal;
}

export interface IAgent {
  readonly metadata: IAgentMetadata;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly priority: AgentPriority;
  readonly capabilities: IAgentCapability[];
  readonly health: AgentHealth;

  // Core methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  getHealth(): Promise<AgentHealth>;
  updateStatus(status: AgentStatus): Promise<void>;

  // Capability methods
  hasCapability(capabilityId: string): boolean;
  getCapability(capabilityId: string): IAgentCapability | undefined;
  listCapabilities(): IAgentCapability[];
}
