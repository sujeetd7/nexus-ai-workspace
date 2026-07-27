import {
  BuiltinAgentFactory,
  BuiltinAgentRegistry,
  BuiltinAgentType,
  BuiltinAgentFactoryComponents,
} from "../builtin/factory";
import { IAgentRegistry } from "../interfaces";

export interface BuiltinRegistrationResult {
  success: boolean;
  registeredAgents: string[];
  failedRegistrations: { agentType: BuiltinAgentType; error: string }[];
  factory: BuiltinAgentFactory;
  registry: BuiltinAgentRegistry;
}

export class BuiltinRegistrationException extends Error {
  public readonly name = "BuiltinRegistrationException";
  public readonly failedAgents: BuiltinAgentType[];

  constructor(failedAgents: BuiltinAgentType[], message?: string) {
    super(
      message ||
        `Failed to register builtin agents: ${failedAgents.join(", ")}`,
    );
    this.failedAgents = failedAgents;
    Object.setPrototypeOf(this, BuiltinRegistrationException.prototype);
  }
}

export class BuiltinRegistrationManager {
  private factory?: BuiltinAgentFactory;
  private registry?: BuiltinAgentRegistry;
  private readonly agentRegistry: IAgentRegistry;

  constructor(agentRegistry: IAgentRegistry) {
    this.agentRegistry = agentRegistry;
  }

  public async registerAllBuiltinAgents(
    components: BuiltinAgentFactoryComponents,
  ): Promise<BuiltinRegistrationResult> {
    const registeredAgents: string[] = [];
    const failedRegistrations: {
      agentType: BuiltinAgentType;
      error: string;
    }[] = [];

    try {
      // Create factory and registry
      this.factory = new BuiltinAgentFactory(components);
      this.registry = new BuiltinAgentRegistry(this.factory);

      // Register each builtin agent type
      for (const agentType of Object.values(BuiltinAgentType)) {
        try {
          await this.registerBuiltinAgent(agentType, components);
          registeredAgents.push(agentType);
        } catch (error) {
          const errorMsg =
            error instanceof Error
              ? error.message
              : "Unknown registration error";
          failedRegistrations.push({ agentType, error: errorMsg });
        }
      }

      return {
        success: failedRegistrations.length === 0,
        registeredAgents,
        failedRegistrations,
        factory: this.factory,
        registry: this.registry,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      throw new BuiltinRegistrationException(
        Object.values(BuiltinAgentType),
        errorMsg,
      );
    }
  }

  private async registerBuiltinAgent(
    agentType: BuiltinAgentType,
    components: BuiltinAgentFactoryComponents,
  ): Promise<void> {
    if (!this.factory || !this.registry) {
      throw new Error(
        "Factory and registry must be initialized before registering agents",
      );
    }

    // Check if required components are available for this agent type
    this.validateComponentsForAgentType(agentType, components);

    // Register in builtin registry
    const instance = this.registry.registerAgent(agentType);

    // Initialize the agent
    await instance.agent.initialize();

    // Register in main agent registry
    await this.agentRegistry.register(instance.agent);

    // Update status to indicate successful registration
    this.registry.updateAgentStatus(instance.id, instance.agent.status);
  }

  private validateComponentsForAgentType(
    agentType: BuiltinAgentType,
    components: BuiltinAgentFactoryComponents,
  ): void {
    switch (agentType) {
      case BuiltinAgentType.MEMORY:
        if (!components.memoryComponents) {
          throw new Error(`Missing memoryComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.TOOL:
        if (!components.toolComponents) {
          throw new Error(`Missing toolComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.PLANNER:
        if (!components.plannerComponents) {
          throw new Error(`Missing plannerComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.WORKFLOW:
        if (!components.workflowComponents) {
          throw new Error(`Missing workflowComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.EXECUTION:
        if (!components.executionComponents) {
          throw new Error(`Missing executionComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.COORDINATOR:
        if (!components.coordinatorComponents) {
          throw new Error(`Missing coordinatorComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.PLUGIN:
        if (!components.pluginComponents) {
          throw new Error(`Missing pluginComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.COMMUNICATION:
        if (!components.communicationComponents) {
          throw new Error(`Missing communicationComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.SCHEDULER:
        if (!components.schedulerComponents) {
          throw new Error(`Missing schedulerComponents for ${agentType}`);
        }
        break;
      case BuiltinAgentType.ORCHESTRATOR:
        if (!components.orchestratorComponents) {
          throw new Error(`Missing orchestratorComponents for ${agentType}`);
        }
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  public async unregisterAllBuiltinAgents(): Promise<void> {
    if (!this.registry) {
      return;
    }

    const allAgents = this.registry.listAllAgents();

    for (const instance of allAgents) {
      try {
        // Shutdown agent
        await instance.agent.shutdown();

        // Unregister from main registry
        await this.agentRegistry.remove(instance.agent.metadata.id);

        // Unregister from builtin registry
        this.registry.unregisterAgent(instance.id);
      } catch (error) {
        // Log error but continue with other agents
        console.error(`Failed to unregister agent ${instance.id}:`, error);
      }
    }
  }

  public getFactory(): BuiltinAgentFactory | undefined {
    return this.factory;
  }

  public getRegistry(): BuiltinAgentRegistry | undefined {
    return this.registry;
  }
}
