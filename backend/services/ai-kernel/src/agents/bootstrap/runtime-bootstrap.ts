import { RuntimeInitializer, RuntimeInitializationOptions, RuntimeComponents } from "../runtime/runtime-initializer";
import { RuntimeShutdownManager, ShutdownResult } from "../runtime/runtime-shutdown";
import { RuntimeHealthAggregator, RuntimeHealthComponents, AggregatedRuntimeHealth } from "./runtime-health";

export interface BootstrapOptions extends RuntimeInitializationOptions {
  autoStart?: boolean;
  healthCheckInterval?: number;
}

export interface BootstrapState {
  initialized: boolean;
  started: boolean;
  shutdownInProgress: boolean;
  healthCheck: {
    enabled: boolean;
    interval?: number;
    lastCheck?: Date;
  };
}

export class RuntimeBootstrapException extends Error {
  public readonly name = "RuntimeBootstrapException";
  
  constructor(message?: string) {
    super(message || "Runtime bootstrap failed");
    Object.setPrototypeOf(this, RuntimeBootstrapException.prototype);
  }
}

export class RuntimeBootstrap {
  private initializer: RuntimeInitializer;
  private shutdownManager: RuntimeShutdownManager;
  private healthAggregator?: RuntimeHealthAggregator;
  private components?: RuntimeComponents;
  private state: BootstrapState = {
    initialized: false,
    started: false,
    shutdownInProgress: false,
    healthCheck: {
      enabled: false
    }
  };
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.initializer = new RuntimeInitializer();
    this.shutdownManager = new RuntimeShutdownManager();
  }

  public async bootstrap(options: BootstrapOptions): Promise<RuntimeComponents> {
    if (this.state.initialized) {
      throw new RuntimeBootstrapException("Runtime is already initialized");
    }

    try {
      // Initialize all components
      console.log("Starting runtime initialization...");
      this.components = await this.initializer.initialize(options);
      this.state.initialized = true;

      // Setup health aggregator
      this.setupHealthAggregator();

      // Start health monitoring if configured
      if (options.healthCheckInterval) {
        this.startHealthMonitoring(options.healthCheckInterval);
      }

      // Auto-start if requested
      if (options.autoStart) {
        await this.start();
      }

      console.log("Runtime bootstrap completed successfully");
      return this.components;

    } catch (error) {
      console.error("Runtime bootstrap failed:", error);
      throw new RuntimeBootstrapException(error instanceof Error ? error.message : "Unknown bootstrap error");
    }
  }

  public async start(): Promise<void> {
    if (!this.state.initialized || !this.components) {
      throw new RuntimeBootstrapException("Runtime must be initialized before starting");
    }

    if (this.state.started) {
      console.warn("Runtime is already started");
      return;
    }

    try {
      console.log("Starting runtime components...");

      // Start orchestrator (which coordinates other components)
      await this.components.orchestrator.start();
      
      // Initialize all builtin agents
      const allAgents = this.components.builtinRegistration.registry.listAllAgents();
      for (const instance of allAgents) {
        await this.components.lifecycleManager.start(instance.agent.metadata.id);
      }

      this.state.started = true;
      console.log("Runtime started successfully");

    } catch (error) {
      console.error("Failed to start runtime:", error);
      throw new RuntimeBootstrapException(`Failed to start runtime: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  public async shutdown(): Promise<ShutdownResult> {
    if (!this.state.initialized || !this.components) {
      throw new RuntimeBootstrapException("Runtime is not initialized");
    }

    if (this.state.shutdownInProgress) {
      throw new RuntimeBootstrapException("Shutdown already in progress");
    }

    this.state.shutdownInProgress = true;

    try {
      console.log("Starting runtime shutdown...");

      // Stop health monitoring
      this.stopHealthMonitoring();

      // Shutdown all components
      const result = await this.shutdownManager.shutdown(this.components);

      // Reset state
      this.state.initialized = false;
      this.state.started = false;
      this.components = undefined;
      this.healthAggregator = undefined;

      if (result.success) {
        console.log("Runtime shutdown completed successfully");
      } else {
        console.warn("Runtime shutdown completed with errors:", result.failedShutdowns);
      }

      return result;

    } catch (error) {
      console.error("Runtime shutdown failed:", error);
      throw new RuntimeBootstrapException(`Shutdown failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      this.state.shutdownInProgress = false;
    }
  }

  public async getHealth(): Promise<AggregatedRuntimeHealth | null> {
    if (!this.healthAggregator) {
      return null;
    }

    try {
      const health = await this.healthAggregator.getAggregatedHealth();
      this.state.healthCheck.lastCheck = new Date();
      return health;
    } catch (error) {
      console.error("Health check failed:", error);
      return null;
    }
  }

  public getState(): BootstrapState {
    return { ...this.state };
  }

  public getComponents(): RuntimeComponents | undefined {
    return this.components;
  }

  private setupHealthAggregator(): void {
    if (!this.components) {
      return;
    }

    const healthComponents: RuntimeHealthComponents = {
      agentRegistry: this.components.agentRegistry,
      agentRuntime: this.components.agentRuntime,
      scheduler: this.components.scheduler,
      planner: this.components.planner,
      workflowEngine: this.components.workflowEngine,
      coordinator: this.components.coordinator,
      orchestrator: this.components.orchestrator,
      pluginLoader: this.components.pluginLoader,
      memory: this.components.memory,
      communicationManager: this.components.communicationManager,
      builtinRegistry: this.components.builtinRegistration.registry
    };

    this.healthAggregator = new RuntimeHealthAggregator(healthComponents);
  }

  private startHealthMonitoring(interval: number): void {
    if (this.healthCheckTimer) {
      this.stopHealthMonitoring();
    }

    this.state.healthCheck.enabled = true;
    this.state.healthCheck.interval = interval;

    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.getHealth();
        if (health && health.overallStatus !== "healthy") {
          console.warn("Runtime health degraded:", {
            status: health.overallStatus,
            unhealthyComponents: health.componentHealths
              .filter(c => c.status === "unhealthy")
              .map(c => c.componentName),
            errors: health.aggregatedErrors
          });
        }
      } catch (error) {
        console.error("Health monitoring error:", error);
      }
    }, interval);

    console.log(`Health monitoring started with ${interval}ms interval`);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    this.state.healthCheck.enabled = false;
    this.state.healthCheck.interval = undefined;
  }
}