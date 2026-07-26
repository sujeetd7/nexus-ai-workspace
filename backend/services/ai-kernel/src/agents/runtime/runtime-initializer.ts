import { IAgentRegistry } from "../interfaces";
import { AgentRegistry } from "../registry";
import { IAgentLifecycleManager, AgentLifecycleManager } from "../lifecycle";
import { IAgentScheduler, AgentScheduler } from "../scheduler";
import { IAgentPlanner } from "../planner";
import { IWorkflowEngine } from "../workflow";
import { IAgentCoordinator, AgentCoordinator } from "../coordinator";
import { IAgentOrchestrator, AgentOrchestrator } from "../orchestrator";
import { IPluginLoader, PluginLoader } from "../plugins";
import { IAgentMemory } from "../memory";
import { ICommunicationManager, CommunicationManager } from "../communication";
import { IAgentRuntime, AgentRuntime } from "./agent-runtime";
import { BuiltinRegistrationManager, BuiltinRegistrationResult } from "./builtin-registration";
import { BuiltinAgentFactoryComponents } from "../builtin/factory";

export interface RuntimeComponents {
  agentRegistry: IAgentRegistry;
  lifecycleManager: IAgentLifecycleManager;
  scheduler: IAgentScheduler;
  planner: IAgentPlanner;
  workflowEngine: IWorkflowEngine;
  coordinator: IAgentCoordinator;
  orchestrator: IAgentOrchestrator;
  pluginLoader: IPluginLoader;
  memory: IAgentMemory;
  communicationManager: ICommunicationManager;
  agentRuntime: IAgentRuntime;
  builtinRegistration: BuiltinRegistrationResult;
}

export interface RuntimeInitializationOptions {
  // Core components (required)
  planner: IAgentPlanner;
  workflowEngine: IWorkflowEngine;
  memory: IAgentMemory;
  
  // Optional component configurations
  maxConcurrency?: number;
  enablePlugins?: boolean;
  pluginSearchPaths?: string[];
}

export class RuntimeInitializationException extends Error {
  public readonly name = "RuntimeInitializationException";
  public readonly failedComponent: string;
  
  constructor(failedComponent: string, message?: string) {
    super(message || `Failed to initialize runtime component: ${failedComponent}`);
    this.failedComponent = failedComponent;
    Object.setPrototypeOf(this, RuntimeInitializationException.prototype);
  }
}

export class RuntimeInitializer {
  private initialized = false;
  private components?: RuntimeComponents;

  public async initialize(options: RuntimeInitializationOptions): Promise<RuntimeComponents> {
    if (this.initialized) {
      throw new RuntimeInitializationException("Runtime", "Runtime is already initialized");
    }

    try {
      // Initialize core components in dependency order
      const agentRegistry = await this.initializeAgentRegistry();
      const lifecycleManager = await this.initializeLifecycleManager(agentRegistry);
      const scheduler = await this.initializeScheduler(options.maxConcurrency);
      const communicationManager = await this.initializeCommunicationManager();
      const agentRuntime = await this.initializeAgentRuntime(agentRegistry);
      const coordinator = await this.initializeCoordinator(agentRegistry, agentRuntime, communicationManager);
      const orchestrator = await this.initializeOrchestrator(agentRegistry, lifecycleManager, scheduler, options.planner, options.workflowEngine, agentRuntime, communicationManager, options.memory);
      const pluginLoader = await this.initializePluginLoader(options.enablePlugins, options.pluginSearchPaths, agentRegistry);

      // Initialize builtin agents
      const builtinComponents = await this.createBuiltinComponents(options.memory, agentRegistry, options.planner, options.workflowEngine, agentRuntime, coordinator, pluginLoader, communicationManager, scheduler, orchestrator);
      const builtinRegistrationManager = new BuiltinRegistrationManager(agentRegistry);
      const builtinRegistration = await builtinRegistrationManager.registerAllBuiltinAgents(builtinComponents);

      this.components = {
        agentRegistry,
        lifecycleManager,
        scheduler,
        planner: options.planner,
        workflowEngine: options.workflowEngine,
        coordinator,
        orchestrator,
        pluginLoader,
        memory: options.memory,
        communicationManager,
        agentRuntime,
        builtinRegistration
      };

      this.initialized = true;
      return this.components;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown initialization error';
      if (error instanceof RuntimeInitializationException) {
        throw error;
      }
      throw new RuntimeInitializationException("Runtime", errorMsg);
    }
  }

  public getComponents(): RuntimeComponents | undefined {
    return this.components;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  // Individual component initialization methods
  private async initializeAgentRegistry(): Promise<IAgentRegistry> {
    try {
      return new AgentRegistry();
    } catch (error) {
      throw new RuntimeInitializationException("AgentRegistry", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeLifecycleManager(agentRegistry: IAgentRegistry): Promise<IAgentLifecycleManager> {
    try {
      return new AgentLifecycleManager(agentRegistry);
    } catch (error) {
      throw new RuntimeInitializationException("LifecycleManager", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeScheduler(maxConcurrency?: number): Promise<IAgentScheduler> {
    try {
      const scheduler = new AgentScheduler();
      // Configure max concurrency if provided
      // Note: AgentScheduler constructor doesn't take maxConcurrency parameter
      // This would need to be configured after creation if the scheduler supports it
      return scheduler;
    } catch (error) {
      throw new RuntimeInitializationException("Scheduler", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeCommunicationManager(): Promise<ICommunicationManager> {
    try {
      return new CommunicationManager();
    } catch (error) {
      throw new RuntimeInitializationException("CommunicationManager", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeCoordinator(agentRegistry: IAgentRegistry, agentRuntime: IAgentRuntime, communicationManager: ICommunicationManager): Promise<IAgentCoordinator> {
    try {
      return new AgentCoordinator({
        agentRegistry,
        agentRuntime,
        communicationManager
      });
    } catch (error) {
      throw new RuntimeInitializationException("Coordinator", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeAgentRuntime(agentRegistry: IAgentRegistry): Promise<IAgentRuntime> {
    try {
      return new AgentRuntime(agentRegistry);
    } catch (error) {
      throw new RuntimeInitializationException("AgentRuntime", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializeOrchestrator(
    agentRegistry: IAgentRegistry,
    lifecycleManager: IAgentLifecycleManager,
    scheduler: IAgentScheduler,
    planner: IAgentPlanner,
    workflowEngine: IWorkflowEngine,
    agentRuntime: IAgentRuntime,
    communicationManager: ICommunicationManager,
    memory: IAgentMemory
  ): Promise<IAgentOrchestrator> {
    try {
      return new AgentOrchestrator({
        agentRegistry,
        lifecycleManager,
        scheduler,
        planner,
        workflowEngine,
        agentRuntime,
        communicationManager,
        agentMemory: memory
      });
    } catch (error) {
      throw new RuntimeInitializationException("Orchestrator", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async initializePluginLoader(enablePlugins?: boolean, searchPaths?: string[], agentRegistry?: IAgentRegistry): Promise<IPluginLoader> {
    try {
      if (!enablePlugins) {
        // Return a basic plugin loader even if plugins are disabled
        return new PluginLoader(agentRegistry);
      }
      
      const pluginLoader = new PluginLoader(agentRegistry);
      
      // Discover plugins from search paths if provided
      if (searchPaths && searchPaths.length > 0) {
        try {
          await pluginLoader.discover({ 
            searchPaths,
            recursive: true,
            validateOnDiscovery: true 
          });
        } catch (error) {
          // Log warning but don't fail initialization
          console.warn("Failed to discover plugins:", error);
        }
      }
      
      return pluginLoader;
    } catch (error) {
      throw new RuntimeInitializationException("PluginLoader", error instanceof Error ? error.message : "Unknown error");
    }
  }

  private async createBuiltinComponents(
    memory: IAgentMemory,
    agentRegistry: IAgentRegistry,
    planner: IAgentPlanner,
    workflowEngine: IWorkflowEngine,
    agentRuntime: IAgentRuntime,
    coordinator: IAgentCoordinator,
    pluginLoader: IPluginLoader,
    communicationManager: ICommunicationManager,
    scheduler: IAgentScheduler,
    orchestrator: IAgentOrchestrator
  ): Promise<BuiltinAgentFactoryComponents> {
    // Create component bundles for each builtin agent type
    return {
      memoryComponents: {
        conversationMemory: memory as any, // Type assertion needed for interface compatibility
        workspaceMemory: memory as any,
        scratchpadMemory: memory as any,
        sharedMemory: memory as any
      },
      toolComponents: {
        toolRegistry: agentRegistry as any, // Would need proper tool registry
        toolExecutor: agentRuntime as any // Would need proper tool executor
      },
      plannerComponents: {
        planner: planner
      },
      workflowComponents: {
        workflowEngine
      },
      executionComponents: {
        agentRuntime
      },
      coordinatorComponents: {
        agentCoordinator: coordinator
      },
      pluginComponents: {
        pluginRegistry: pluginLoader as any, // Would need proper plugin registry
        pluginLoader
      },
      communicationComponents: {
        communicationManager
      },
      schedulerComponents: {
        agentScheduler: scheduler
      },
      orchestratorComponents: {
        agentOrchestrator: orchestrator
      }
    };
  }
}