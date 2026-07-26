import { AgentType, AgentHealth } from "../types";
import { IAgent, IAgentCapability, IAgentRegistry } from "../interfaces";
import { 
  AgentNotFoundException, 
  DuplicateAgentException, 
  AgentRegistrationException 
} from "../exceptions";

export class AgentRegistry implements IAgentRegistry {
  private readonly agents: Map<string, IAgent> = new Map();

  public async register(agent: IAgent): Promise<void> {
    if (!agent.metadata.id) {
      throw new AgentRegistrationException("Agent ID is required");
    }

    if (this.agents.has(agent.metadata.id)) {
      throw new DuplicateAgentException(agent.metadata.id);
    }

    try {
      // Validate agent metadata
      this.validateAgent(agent);
      
      // Store the agent
      this.agents.set(agent.metadata.id, agent);
      
    } catch (error) {
      if (error instanceof DuplicateAgentException || error instanceof AgentRegistrationException) {
        throw error;
      }
      
      throw new AgentRegistrationException(
        `Failed to register agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        agent.metadata.id
      );
    }
  }

  public async remove(agentId: string): Promise<void> {
    if (!this.agents.has(agentId)) {
      throw new AgentNotFoundException(agentId);
    }

    const agent = this.agents.get(agentId)!;
    
    try {
      // Shutdown agent before removal
      await agent.shutdown();
    } catch (error) {
      // Continue with removal even if shutdown fails
      console.warn(`Failed to shutdown agent ${agentId} during removal:`, error);
    }

    this.agents.delete(agentId);
  }

  public async update(agent: IAgent): Promise<void> {
    if (!this.agents.has(agent.metadata.id)) {
      throw new AgentNotFoundException(agent.metadata.id);
    }

    try {
      // Validate updated agent
      this.validateAgent(agent);
      
      // Update the agent
      this.agents.set(agent.metadata.id, agent);
      
    } catch (error) {
      if (error instanceof AgentNotFoundException) {
        throw error;
      }
      
      throw new AgentRegistrationException(
        `Failed to update agent: ${error instanceof Error ? error.message : "Unknown error"}`,
        agent.metadata.id
      );
    }
  }

  public async find(agentId: string): Promise<IAgent | undefined> {
    return this.agents.get(agentId);
  }

  public async list(): Promise<IAgent[]> {
    return Array.from(this.agents.values());
  }

  public async findByCapability(capabilityId: string): Promise<IAgent[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.hasCapability(capabilityId)
    );
  }

  public async findByType(type: AgentType): Promise<IAgent[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.type === type
    );
  }

  public async health(): Promise<Record<string, AgentHealth>> {
    const healthMap: Record<string, AgentHealth> = {};
    
    for (const [agentId, agent] of this.agents) {
      try {
        healthMap[agentId] = await agent.getHealth();
      } catch (error) {
        healthMap[agentId] = {
          status: "unhealthy",
          uptime: 0,
          lastHeartbeat: new Date(),
          errors: [error instanceof Error ? error.message : "Unknown error"],
          warnings: [],
          metrics: {}
        };
      }
    }
    
    return healthMap;
  }

  public async healthCheck(agentId: string): Promise<AgentHealth> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentNotFoundException(agentId);
    }

    try {
      return await agent.getHealth();
    } catch (error) {
      return {
        status: "unhealthy",
        uptime: 0,
        lastHeartbeat: new Date(),
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
        metrics: {}
      };
    }
  }

  public async exists(agentId: string): Promise<boolean> {
    return this.agents.has(agentId);
  }

  public async count(): Promise<number> {
    return this.agents.size;
  }

  public async listCapabilities(): Promise<IAgentCapability[]> {
    const capabilityMap = new Map<string, IAgentCapability>();
    
    for (const agent of this.agents.values()) {
      for (const capability of agent.capabilities) {
        capabilityMap.set(capability.id, capability);
      }
    }
    
    return Array.from(capabilityMap.values());
  }

  private validateAgent(agent: IAgent): void {
    if (!agent.metadata.id) {
      throw new Error("Agent ID is required");
    }

    if (!agent.metadata.name) {
      throw new Error("Agent name is required");
    }

    if (!agent.metadata.version) {
      throw new Error("Agent version is required");
    }

    if (!agent.type) {
      throw new Error("Agent type is required");
    }

    if (!Object.values(AgentType).includes(agent.type)) {
      throw new Error(`Invalid agent type: ${agent.type}`);
    }

    // Validate capabilities
    for (const capability of agent.capabilities) {
      if (!capability.id) {
        throw new Error("Capability ID is required");
      }
      if (!capability.name) {
        throw new Error("Capability name is required");
      }
    }
  }
}