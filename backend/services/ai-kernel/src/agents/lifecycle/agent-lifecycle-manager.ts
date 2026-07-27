import { AgentLifecycleState, AgentHealth } from "../types";
import { IAgent, IAgentRegistry } from "../interfaces";
import {
  AgentNotFoundException,
  InvalidStateTransitionException,
  AgentLifecycleException,
} from "../exceptions";

export interface IAgentLifecycleManager {
  initialize(agentId: string): Promise<void>;
  start(agentId: string): Promise<void>;
  stop(agentId: string): Promise<void>;
  pause(agentId: string): Promise<void>;
  resume(agentId: string): Promise<void>;
  restart(agentId: string): Promise<void>;
  shutdown(agentId: string): Promise<void>;
  health(agentId: string): Promise<AgentHealth>;
  getState(agentId: string): Promise<AgentLifecycleState>;
}

export class AgentLifecycleManager implements IAgentLifecycleManager {
  private readonly agentStates: Map<string, AgentLifecycleState> = new Map();
  private readonly validTransitions: Map<
    AgentLifecycleState,
    AgentLifecycleState[]
  > = new Map([
    [AgentLifecycleState.REGISTERED, [AgentLifecycleState.INITIALIZING]],
    [
      AgentLifecycleState.INITIALIZING,
      [AgentLifecycleState.READY, AgentLifecycleState.FAILED],
    ],
    [
      AgentLifecycleState.READY,
      [AgentLifecycleState.RUNNING, AgentLifecycleState.STOPPING],
    ],
    [
      AgentLifecycleState.RUNNING,
      [AgentLifecycleState.PAUSED, AgentLifecycleState.STOPPING],
    ],
    [
      AgentLifecycleState.PAUSED,
      [AgentLifecycleState.RUNNING, AgentLifecycleState.STOPPING],
    ],
    [
      AgentLifecycleState.STOPPING,
      [AgentLifecycleState.STOPPED, AgentLifecycleState.FAILED],
    ],
    [AgentLifecycleState.STOPPED, [AgentLifecycleState.INITIALIZING]],
    [AgentLifecycleState.FAILED, [AgentLifecycleState.INITIALIZING]],
  ]);

  constructor(private readonly registry: IAgentRegistry) {}

  public async initialize(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);

    // Set initial state if not exists
    if (!this.agentStates.has(agentId)) {
      this.agentStates.set(agentId, AgentLifecycleState.REGISTERED);
    }

    const currentState = this.agentStates.get(agentId)!;

    if (
      !this.isValidTransition(currentState, AgentLifecycleState.INITIALIZING)
    ) {
      throw new InvalidStateTransitionException(
        agentId,
        currentState,
        AgentLifecycleState.INITIALIZING,
      );
    }

    try {
      this.setState(agentId, AgentLifecycleState.INITIALIZING);

      await agent.initialize();

      this.setState(agentId, AgentLifecycleState.READY);
    } catch (error) {
      this.setState(agentId, AgentLifecycleState.FAILED);
      throw new AgentLifecycleException(
        agentId,
        "initialize",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async start(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    const currentState = this.getAgentState(agentId);

    if (!this.isValidTransition(currentState, AgentLifecycleState.RUNNING)) {
      throw new InvalidStateTransitionException(
        agentId,
        currentState,
        AgentLifecycleState.RUNNING,
      );
    }

    try {
      this.setState(agentId, AgentLifecycleState.RUNNING);

      // Update agent status
      await agent.updateStatus(
        currentState === AgentLifecycleState.PAUSED
          ? agent.status // Keep current status if resuming
          : ("running" as any), // Set to running if starting fresh
      );
    } catch (error) {
      this.setState(agentId, AgentLifecycleState.FAILED);
      throw new AgentLifecycleException(
        agentId,
        "start",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async stop(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    const currentState = this.getAgentState(agentId);

    if (!this.isValidTransition(currentState, AgentLifecycleState.STOPPING)) {
      throw new InvalidStateTransitionException(
        agentId,
        currentState,
        AgentLifecycleState.STOPPING,
      );
    }

    try {
      this.setState(agentId, AgentLifecycleState.STOPPING);

      // Update agent status
      await agent.updateStatus("stopped" as any);

      this.setState(agentId, AgentLifecycleState.STOPPED);
    } catch (error) {
      this.setState(agentId, AgentLifecycleState.FAILED);
      throw new AgentLifecycleException(
        agentId,
        "stop",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async pause(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);
    const currentState = this.getAgentState(agentId);

    if (!this.isValidTransition(currentState, AgentLifecycleState.PAUSED)) {
      throw new InvalidStateTransitionException(
        agentId,
        currentState,
        AgentLifecycleState.PAUSED,
      );
    }

    try {
      this.setState(agentId, AgentLifecycleState.PAUSED);

      // Update agent status
      await agent.updateStatus("paused" as any);
    } catch (error) {
      this.setState(agentId, AgentLifecycleState.FAILED);
      throw new AgentLifecycleException(
        agentId,
        "pause",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async resume(agentId: string): Promise<void> {
    const currentState = this.getAgentState(agentId);

    if (currentState !== AgentLifecycleState.PAUSED) {
      throw new InvalidStateTransitionException(
        agentId,
        currentState,
        AgentLifecycleState.RUNNING,
      );
    }

    await this.start(agentId);
  }

  public async restart(agentId: string): Promise<void> {
    try {
      // Stop if running
      const currentState = this.getAgentState(agentId);
      if (
        currentState === AgentLifecycleState.RUNNING ||
        currentState === AgentLifecycleState.PAUSED
      ) {
        await this.stop(agentId);
      }

      // Reinitialize and start
      await this.initialize(agentId);
      await this.start(agentId);
    } catch (error) {
      throw new AgentLifecycleException(
        agentId,
        "restart",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async shutdown(agentId: string): Promise<void> {
    const agent = await this.getAgent(agentId);

    try {
      // Stop if running
      const currentState = this.getAgentState(agentId);
      if (
        currentState === AgentLifecycleState.RUNNING ||
        currentState === AgentLifecycleState.PAUSED
      ) {
        await this.stop(agentId);
      }

      // Shutdown agent
      await agent.shutdown();

      // Remove from lifecycle tracking
      this.agentStates.delete(agentId);
    } catch (error) {
      this.setState(agentId, AgentLifecycleState.FAILED);
      throw new AgentLifecycleException(
        agentId,
        "shutdown",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  public async health(agentId: string): Promise<AgentHealth> {
    const agent = await this.getAgent(agentId);
    return await agent.getHealth();
  }

  public async getState(agentId: string): Promise<AgentLifecycleState> {
    await this.getAgent(agentId); // Validate agent exists
    return this.getAgentState(agentId);
  }

  private async getAgent(agentId: string): Promise<IAgent> {
    const agent = await this.registry.find(agentId);
    if (!agent) {
      throw new AgentNotFoundException(agentId);
    }
    return agent;
  }

  private getAgentState(agentId: string): AgentLifecycleState {
    return this.agentStates.get(agentId) || AgentLifecycleState.REGISTERED;
  }

  private setState(agentId: string, state: AgentLifecycleState): void {
    this.agentStates.set(agentId, state);
  }

  private isValidTransition(
    fromState: AgentLifecycleState,
    toState: AgentLifecycleState,
  ): boolean {
    const validStates = this.validTransitions.get(fromState);
    return validStates ? validStates.includes(toState) : false;
  }
}
