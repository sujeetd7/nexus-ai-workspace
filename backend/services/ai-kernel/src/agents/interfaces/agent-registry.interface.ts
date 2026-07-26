import { AgentType, AgentHealth } from "../types";
import { IAgent, IAgentCapability } from "./agent.interface";

export interface IAgentRegistry {
  // Registration methods
  register(agent: IAgent): Promise<void>;
  remove(agentId: string): Promise<void>;
  update(agent: IAgent): Promise<void>;
  
  // Query methods
  find(agentId: string): Promise<IAgent | undefined>;
  list(): Promise<IAgent[]>;
  findByCapability(capabilityId: string): Promise<IAgent[]>;
  findByType(type: AgentType): Promise<IAgent[]>;
  
  // Health methods
  health(): Promise<Record<string, AgentHealth>>;
  healthCheck(agentId: string): Promise<AgentHealth>;
  
  // Utility methods
  exists(agentId: string): Promise<boolean>;
  count(): Promise<number>;
  listCapabilities(): Promise<IAgentCapability[]>;
}