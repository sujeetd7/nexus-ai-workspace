import { IAgent } from "../../interfaces";
import { 
  MemoryAgent, 
  MemoryAgentComponents 
} from "../memory-agent";
import { 
  ToolAgent, 
  ToolAgentComponents 
} from "../tool-agent";
import { 
  PlannerAgent, 
  PlannerAgentComponents 
} from "../planner-agent";
import { 
  WorkflowAgent, 
  WorkflowAgentComponents 
} from "../workflow-agent";
import { 
  ExecutionAgent, 
  ExecutionAgentComponents 
} from "../execution-agent";
import { 
  CoordinatorAgent, 
  CoordinatorAgentComponents 
} from "../coordinator-agent";
import { 
  PluginAgent, 
  PluginAgentComponents 
} from "../plugin-agent";
import { 
  CommunicationAgent, 
  CommunicationAgentComponents 
} from "../communication-agent";
import { 
  SchedulerAgent, 
  SchedulerAgentComponents 
} from "../scheduler-agent";
import { 
  OrchestratorAgent, 
  OrchestratorAgentComponents 
} from "../orchestrator-agent";

export enum BuiltinAgentType {
  MEMORY = "memory-agent",
  TOOL = "tool-agent",
  PLANNER = "planner-agent",
  WORKFLOW = "workflow-agent",
  EXECUTION = "execution-agent",
  COORDINATOR = "coordinator-agent",
  PLUGIN = "plugin-agent",
  COMMUNICATION = "communication-agent",
  SCHEDULER = "scheduler-agent",
  ORCHESTRATOR = "orchestrator-agent"
}

export interface BuiltinAgentFactoryComponents {
  // Memory Agent
  memoryComponents?: MemoryAgentComponents;
  
  // Tool Agent
  toolComponents?: ToolAgentComponents;
  
  // Planner Agent
  plannerComponents?: PlannerAgentComponents;
  
  // Workflow Agent
  workflowComponents?: WorkflowAgentComponents;
  
  // Execution Agent
  executionComponents?: ExecutionAgentComponents;
  
  // Coordinator Agent
  coordinatorComponents?: CoordinatorAgentComponents;
  
  // Plugin Agent
  pluginComponents?: PluginAgentComponents;
  
  // Communication Agent
  communicationComponents?: CommunicationAgentComponents;
  
  // Scheduler Agent
  schedulerComponents?: SchedulerAgentComponents;
  
  // Orchestrator Agent
  orchestratorComponents?: OrchestratorAgentComponents;
}

export class BuiltinAgentFactoryException extends Error {
  public readonly name = "BuiltinAgentFactoryException";
  public readonly agentType: string;
  
  constructor(agentType: string, message?: string) {
    super(message || `Failed to create builtin agent of type '${agentType}'`);
    this.agentType = agentType;
    Object.setPrototypeOf(this, BuiltinAgentFactoryException.prototype);
  }
}

export class UnsupportedAgentTypeException extends Error {
  public readonly name = "UnsupportedAgentTypeException";
  public readonly agentType: string;
  
  constructor(agentType: string, message?: string) {
    super(message || `Unsupported builtin agent type '${agentType}'`);
    this.agentType = agentType;
    Object.setPrototypeOf(this, UnsupportedAgentTypeException.prototype);
  }
}

export class MissingComponentsException extends Error {
  public readonly name = "MissingComponentsException";
  public readonly agentType: string;
  public readonly missingComponent: string;
  
  constructor(agentType: string, missingComponent: string, message?: string) {
    super(message || `Missing required components for '${agentType}': ${missingComponent}`);
    this.agentType = agentType;
    this.missingComponent = missingComponent;
    Object.setPrototypeOf(this, MissingComponentsException.prototype);
  }
}

export class BuiltinAgentFactory {
  private readonly components: BuiltinAgentFactoryComponents;
  
  constructor(components: BuiltinAgentFactoryComponents) {
    this.components = components;
  }

  public createAgent(agentType: BuiltinAgentType): IAgent {
    try {
      switch (agentType) {
        case BuiltinAgentType.MEMORY:
          return this.createMemoryAgent();
        case BuiltinAgentType.TOOL:
          return this.createToolAgent();
        case BuiltinAgentType.PLANNER:
          return this.createPlannerAgent();
        case BuiltinAgentType.WORKFLOW:
          return this.createWorkflowAgent();
        case BuiltinAgentType.EXECUTION:
          return this.createExecutionAgent();
        case BuiltinAgentType.COORDINATOR:
          return this.createCoordinatorAgent();
        case BuiltinAgentType.PLUGIN:
          return this.createPluginAgent();
        case BuiltinAgentType.COMMUNICATION:
          return this.createCommunicationAgent();
        case BuiltinAgentType.SCHEDULER:
          return this.createSchedulerAgent();
        case BuiltinAgentType.ORCHESTRATOR:
          return this.createOrchestratorAgent();
        default:
          throw new UnsupportedAgentTypeException(agentType);
      }
    } catch (error) {
      if (error instanceof UnsupportedAgentTypeException || error instanceof MissingComponentsException) {
        throw error;
      }
      
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new BuiltinAgentFactoryException(agentType, errorMsg);
    }
  }

  public getSupportedAgentTypes(): BuiltinAgentType[] {
    return Object.values(BuiltinAgentType);
  }

  public isAgentTypeSupported(agentType: string): boolean {
    return Object.values(BuiltinAgentType).includes(agentType as BuiltinAgentType);
  }

  // Individual agent creation methods
  private createMemoryAgent(): MemoryAgent {
    if (!this.components.memoryComponents) {
      throw new MissingComponentsException(BuiltinAgentType.MEMORY, "memoryComponents");
    }
    
    return new MemoryAgent(this.components.memoryComponents);
  }

  private createToolAgent(): ToolAgent {
    if (!this.components.toolComponents) {
      throw new MissingComponentsException(BuiltinAgentType.TOOL, "toolComponents");
    }
    
    return new ToolAgent(this.components.toolComponents);
  }

  private createPlannerAgent(): PlannerAgent {
    if (!this.components.plannerComponents) {
      throw new MissingComponentsException(BuiltinAgentType.PLANNER, "plannerComponents");
    }
    
    return new PlannerAgent(this.components.plannerComponents);
  }

  private createWorkflowAgent(): WorkflowAgent {
    if (!this.components.workflowComponents) {
      throw new MissingComponentsException(BuiltinAgentType.WORKFLOW, "workflowComponents");
    }
    
    return new WorkflowAgent(this.components.workflowComponents);
  }

  private createExecutionAgent(): ExecutionAgent {
    if (!this.components.executionComponents) {
      throw new MissingComponentsException(BuiltinAgentType.EXECUTION, "executionComponents");
    }
    
    return new ExecutionAgent(this.components.executionComponents);
  }

  private createCoordinatorAgent(): CoordinatorAgent {
    if (!this.components.coordinatorComponents) {
      throw new MissingComponentsException(BuiltinAgentType.COORDINATOR, "coordinatorComponents");
    }
    
    return new CoordinatorAgent(this.components.coordinatorComponents);
  }

  private createPluginAgent(): PluginAgent {
    if (!this.components.pluginComponents) {
      throw new MissingComponentsException(BuiltinAgentType.PLUGIN, "pluginComponents");
    }
    
    return new PluginAgent(this.components.pluginComponents);
  }

  private createCommunicationAgent(): CommunicationAgent {
    if (!this.components.communicationComponents) {
      throw new MissingComponentsException(BuiltinAgentType.COMMUNICATION, "communicationComponents");
    }
    
    return new CommunicationAgent(this.components.communicationComponents);
  }

  private createSchedulerAgent(): SchedulerAgent {
    if (!this.components.schedulerComponents) {
      throw new MissingComponentsException(BuiltinAgentType.SCHEDULER, "schedulerComponents");
    }
    
    return new SchedulerAgent(this.components.schedulerComponents);
  }

  private createOrchestratorAgent(): OrchestratorAgent {
    if (!this.components.orchestratorComponents) {
      throw new MissingComponentsException(BuiltinAgentType.ORCHESTRATOR, "orchestratorComponents");
    }
    
    return new OrchestratorAgent(this.components.orchestratorComponents);
  }
}