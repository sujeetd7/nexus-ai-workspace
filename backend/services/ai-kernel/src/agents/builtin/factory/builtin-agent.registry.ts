import { IAgent } from "../../interfaces";
import { AgentStatus } from "../../types";
import { BuiltinAgentType, BuiltinAgentFactory } from "./builtin-agent.factory";

export interface BuiltinAgentInstance {
  id: string;
  type: BuiltinAgentType;
  agent: IAgent;
  status: AgentStatus;
  createdAt: Date;
  lastUsed?: Date;
  usageCount: number;
  metadata: Record<string, unknown>;
}

export interface BuiltinAgentRegistryHealth {
  status: "healthy" | "degraded" | "unhealthy";
  registeredAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  failedAgents: number;
  totalUsage: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
}

export interface BuiltinAgentRegistryMetrics {
  totalRegistrations: number;
  totalUnregistrations: number;
  currentRegistrations: number;
  registrationsByType: Record<BuiltinAgentType, number>;
  usageByType: Record<BuiltinAgentType, number>;
  statusBreakdown: Record<AgentStatus, number>;
  averageUsagePerAgent: number;
  mostUsedAgent?: BuiltinAgentInstance;
  leastUsedAgent?: BuiltinAgentInstance;
  uptime: number;
}

export class BuiltinAgentRegistryException extends Error {
  public readonly name = "BuiltinAgentRegistryException";

  constructor(message?: string) {
    super(message || "Builtin agent registry operation failed");
    Object.setPrototypeOf(this, BuiltinAgentRegistryException.prototype);
  }
}

export class AgentAlreadyRegisteredException extends Error {
  public readonly name = "AgentAlreadyRegisteredException";
  public readonly agentId: string;

  constructor(agentId: string, message?: string) {
    super(message || `Agent '${agentId}' is already registered`);
    this.agentId = agentId;
    Object.setPrototypeOf(this, AgentAlreadyRegisteredException.prototype);
  }
}

export class AgentNotRegisteredException extends Error {
  public readonly name = "AgentNotRegisteredException";
  public readonly agentId: string;

  constructor(agentId: string, message?: string) {
    super(message || `Agent '${agentId}' is not registered`);
    this.agentId = agentId;
    Object.setPrototypeOf(this, AgentNotRegisteredException.prototype);
  }
}

export class BuiltinAgentRegistry {
  private readonly agents: Map<string, BuiltinAgentInstance> = new Map();
  private readonly factory: BuiltinAgentFactory;
  private readonly startTime: Date = new Date();
  private totalRegistrations = 0;
  private totalUnregistrations = 0;
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  constructor(factory: BuiltinAgentFactory) {
    this.factory = factory;
  }

  public registerAgent(
    agentType: BuiltinAgentType,
    agentId?: string,
    metadata?: Record<string, unknown>,
  ): BuiltinAgentInstance {
    try {
      const id = agentId || this.generateAgentId(agentType);

      // Check if agent is already registered
      if (this.agents.has(id)) {
        throw new AgentAlreadyRegisteredException(id);
      }

      // Create agent instance using factory
      const agent = this.factory.createAgent(agentType);

      // Create registry entry
      const instance: BuiltinAgentInstance = {
        id,
        type: agentType,
        agent,
        status: AgentStatus.IDLE,
        createdAt: new Date(),
        usageCount: 0,
        metadata: metadata || {},
      };

      // Register the agent
      this.agents.set(id, instance);
      this.totalRegistrations++;
      this.lastActivity = new Date();

      return instance;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown registration error";
      this.errors.push(errorMsg);
      throw error;
    }
  }

  public unregisterAgent(agentId: string): boolean {
    try {
      const instance = this.agents.get(agentId);
      if (!instance) {
        throw new AgentNotRegisteredException(agentId);
      }

      // Shutdown agent if it's running
      if (instance.status !== AgentStatus.STOPPED) {
        try {
          // Note: shutdown is async but we're in sync method
          // In practice, you might want to make this async
          instance.status = AgentStatus.SHUTTING_DOWN;
        } catch (error) {
          this.warnings.push(
            `Failed to shutdown agent '${agentId}' during unregistration`,
          );
        }
      }

      // Remove from registry
      const removed = this.agents.delete(agentId);
      if (removed) {
        this.totalUnregistrations++;
        this.lastActivity = new Date();
      }

      return removed;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown unregistration error";
      this.errors.push(errorMsg);
      throw error;
    }
  }

  public getAgent(agentId: string): BuiltinAgentInstance | undefined {
    const instance = this.agents.get(agentId);
    if (instance) {
      instance.lastUsed = new Date();
      instance.usageCount++;
      this.lastActivity = new Date();
    }
    return instance;
  }

  public findAgentsByType(agentType: BuiltinAgentType): BuiltinAgentInstance[] {
    return Array.from(this.agents.values()).filter(
      (instance) => instance.type === agentType,
    );
  }

  public findAgentsByStatus(status: AgentStatus): BuiltinAgentInstance[] {
    return Array.from(this.agents.values()).filter(
      (instance) => instance.status === status,
    );
  }

  public listAllAgents(): BuiltinAgentInstance[] {
    return Array.from(this.agents.values());
  }

  public exists(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  public count(): number {
    return this.agents.size;
  }

  public countByType(agentType: BuiltinAgentType): number {
    return this.findAgentsByType(agentType).length;
  }

  public countByStatus(status: AgentStatus): number {
    return this.findAgentsByStatus(status).length;
  }

  public updateAgentStatus(agentId: string, status: AgentStatus): void {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new AgentNotRegisteredException(agentId);
    }

    instance.status = status;
    this.lastActivity = new Date();
  }

  public updateAgentMetadata(
    agentId: string,
    metadata: Record<string, unknown>,
  ): void {
    const instance = this.agents.get(agentId);
    if (!instance) {
      throw new AgentNotRegisteredException(agentId);
    }

    instance.metadata = { ...instance.metadata, ...metadata };
    this.lastActivity = new Date();
  }

  public clear(): void {
    // Shutdown all agents
    for (const instance of this.agents.values()) {
      if (instance.status !== AgentStatus.STOPPED) {
        try {
          instance.status = AgentStatus.SHUTTING_DOWN;
        } catch (error) {
          this.warnings.push(
            `Failed to shutdown agent '${instance.id}' during registry clear`,
          );
        }
      }
    }

    this.agents.clear();
    this.lastActivity = new Date();
  }

  public health(): BuiltinAgentRegistryHealth {
    const agents = this.listAllAgents();
    const activeAgents = agents.filter(
      (a) =>
        a.status === AgentStatus.IDLE || a.status === AgentStatus.INITIALIZING,
    ).length;
    const failedAgents = agents.filter(
      (a) => a.status === AgentStatus.ERROR,
    ).length;
    const totalUsage = agents.reduce((sum, agent) => sum + agent.usageCount, 0);

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (this.errors.length > 0 || failedAgents > 0) {
      status = "unhealthy";
    } else if (this.warnings.length > 0) {
      status = "degraded";
    }

    return {
      status,
      registeredAgents: agents.length,
      activeAgents,
      inactiveAgents: agents.length - activeAgents - failedAgents,
      failedAgents,
      totalUsage,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastActivity: this.lastActivity,
    };
  }

  public metrics(): BuiltinAgentRegistryMetrics {
    const agents = this.listAllAgents();

    // Calculate registration counts by type
    const registrationsByType: Record<BuiltinAgentType, number> = {} as Record<
      BuiltinAgentType,
      number
    >;
    const usageByType: Record<BuiltinAgentType, number> = {} as Record<
      BuiltinAgentType,
      number
    >;

    Object.values(BuiltinAgentType).forEach((type) => {
      registrationsByType[type] = 0;
      usageByType[type] = 0;
    });

    // Calculate status breakdown
    const statusBreakdown: Record<AgentStatus, number> = {} as Record<
      AgentStatus,
      number
    >;
    Object.values(AgentStatus).forEach((status) => {
      statusBreakdown[status] = 0;
    });

    let mostUsedAgent: BuiltinAgentInstance | undefined;
    let leastUsedAgent: BuiltinAgentInstance | undefined;
    let maxUsage = -1;
    let minUsage = Number.MAX_SAFE_INTEGER;

    // Process agents
    for (const agent of agents) {
      registrationsByType[agent.type]++;
      usageByType[agent.type] += agent.usageCount;
      statusBreakdown[agent.status]++;

      if (agent.usageCount > maxUsage) {
        maxUsage = agent.usageCount;
        mostUsedAgent = agent;
      }

      if (agent.usageCount < minUsage) {
        minUsage = agent.usageCount;
        leastUsedAgent = agent;
      }
    }

    const totalUsage = agents.reduce((sum, agent) => sum + agent.usageCount, 0);
    const averageUsagePerAgent =
      agents.length > 0 ? totalUsage / agents.length : 0;

    return {
      totalRegistrations: this.totalRegistrations,
      totalUnregistrations: this.totalUnregistrations,
      currentRegistrations: agents.length,
      registrationsByType,
      usageByType,
      statusBreakdown,
      averageUsagePerAgent,
      mostUsedAgent: agents.length > 0 ? mostUsedAgent : undefined,
      leastUsedAgent: agents.length > 0 ? leastUsedAgent : undefined,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  // Private helper methods
  private generateAgentId(agentType: BuiltinAgentType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${agentType}-${timestamp}-${random}`;
  }
}
