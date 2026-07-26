import { AgentHealth } from "../types";
import { IAgentRegistry } from "../interfaces";
import { IAgentLifecycleManager, AgentLifecycleManager } from "../lifecycle";

export interface IAgentManager {
  initializeAll(): Promise<void>;
  shutdownAll(): Promise<void>;
  startAll(): Promise<void>;
  stopAll(): Promise<void>;
  health(agentId: string): Promise<AgentHealth>;
  healthAll(): Promise<Record<string, AgentHealth>>;
}

export class AgentManager implements IAgentManager {
  private readonly lifecycleManager: IAgentLifecycleManager;

  constructor(private readonly registry: IAgentRegistry) {
    this.lifecycleManager = new AgentLifecycleManager(registry);
  }

  public async initializeAll(): Promise<void> {
    const agents = await this.registry.list();
    const initializationPromises: Promise<void>[] = [];

    for (const agent of agents) {
      const initPromise = this.safeLifecycleOperation(
        agent.metadata.id, 
        "initialize",
        () => this.lifecycleManager.initialize(agent.metadata.id)
      );
      initializationPromises.push(initPromise);
    }

    await Promise.allSettled(initializationPromises);
  }

  public async shutdownAll(): Promise<void> {
    const agents = await this.registry.list();
    const shutdownPromises: Promise<void>[] = [];

    for (const agent of agents) {
      const shutdownPromise = this.safeLifecycleOperation(
        agent.metadata.id, 
        "shutdown",
        () => this.lifecycleManager.shutdown(agent.metadata.id)
      );
      shutdownPromises.push(shutdownPromise);
    }

    await Promise.allSettled(shutdownPromises);
  }

  public async startAll(): Promise<void> {
    const agents = await this.registry.list();
    const startPromises: Promise<void>[] = [];

    for (const agent of agents) {
      const startPromise = this.safeLifecycleOperation(
        agent.metadata.id, 
        "start",
        () => this.lifecycleManager.start(agent.metadata.id)
      );
      startPromises.push(startPromise);
    }

    await Promise.allSettled(startPromises);
  }

  public async stopAll(): Promise<void> {
    const agents = await this.registry.list();
    const stopPromises: Promise<void>[] = [];

    for (const agent of agents) {
      const stopPromise = this.safeLifecycleOperation(
        agent.metadata.id, 
        "stop",
        () => this.lifecycleManager.stop(agent.metadata.id)
      );
      stopPromises.push(stopPromise);
    }

    await Promise.allSettled(stopPromises);
  }

  public async health(agentId: string): Promise<AgentHealth> {
    return await this.lifecycleManager.health(agentId);
  }

  public async healthAll(): Promise<Record<string, AgentHealth>> {
    const agents = await this.registry.list();
    const healthPromises: Promise<{ agentId: string; health: AgentHealth }>[] = [];

    for (const agent of agents) {
      const healthPromise = this.safeHealthCheck(agent.metadata.id);
      healthPromises.push(healthPromise);
    }

    const healthResults = await Promise.allSettled(healthPromises);
    const healthMap: Record<string, AgentHealth> = {};

    for (const result of healthResults) {
      if (result.status === "fulfilled") {
        healthMap[result.value.agentId] = result.value.health;
      }
    }

    return healthMap;
  }

  public getLifecycleManager(): IAgentLifecycleManager {
    return this.lifecycleManager;
  }

  private async safeLifecycleOperation(
    agentId: string, 
    operation: string, 
    operationFn: () => Promise<void>
  ): Promise<void> {
    try {
      await operationFn();
      console.log(`Agent ${agentId}: ${operation} completed successfully`);
    } catch (error) {
      console.error(`Agent ${agentId}: ${operation} failed:`, error);
      // Don't re-throw to allow other operations to continue
    }
  }

  private async safeHealthCheck(agentId: string): Promise<{ agentId: string; health: AgentHealth }> {
    try {
      const health = await this.lifecycleManager.health(agentId);
      return { agentId, health };
    } catch (error) {
      // Return unhealthy status if health check fails
      return {
        agentId,
        health: {
          status: "unhealthy",
          uptime: 0,
          lastHeartbeat: new Date(),
          errors: [error instanceof Error ? error.message : "Unknown error"],
          warnings: [],
          metrics: {}
        }
      };
    }
  }
}