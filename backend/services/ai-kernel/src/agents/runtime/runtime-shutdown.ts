import { RuntimeComponents } from "./runtime-initializer";

export interface ShutdownResult {
  success: boolean;
  shutdownOrder: string[];
  failedShutdowns: { component: string; error: string }[];
  totalShutdownTime: number;
}

export class RuntimeShutdownException extends Error {
  public readonly name = "RuntimeShutdownException";
  public readonly failedComponents: string[];

  constructor(failedComponents: string[], message?: string) {
    super(
      message ||
        `Failed to shutdown components: ${failedComponents.join(", ")}`,
    );
    this.failedComponents = failedComponents;
    Object.setPrototypeOf(this, RuntimeShutdownException.prototype);
  }
}

export class RuntimeShutdownManager {
  private shutdownInProgress = false;

  public async shutdown(
    components: RuntimeComponents,
  ): Promise<ShutdownResult> {
    if (this.shutdownInProgress) {
      throw new RuntimeShutdownException([], "Shutdown already in progress");
    }

    this.shutdownInProgress = true;
    const startTime = Date.now();
    const shutdownOrder: string[] = [];
    const failedShutdowns: { component: string; error: string }[] = [];

    try {
      // Shutdown in reverse dependency order to avoid issues

      // 1. First, unregister all builtin agents
      await this.shutdownComponent(
        "BuiltinAgents",
        async () => {
          if (components.builtinRegistration.registry) {
            const allAgents =
              components.builtinRegistration.registry.listAllAgents();
            for (const instance of allAgents) {
              try {
                await instance.agent.shutdown();
                await components.agentRegistry.remove(
                  instance.agent.metadata.id,
                );
                components.builtinRegistration.registry.unregisterAgent(
                  instance.id,
                );
              } catch (error) {
                // Log but continue with other agents
                console.warn(
                  `Failed to shutdown builtin agent ${instance.id}:`,
                  error,
                );
              }
            }
          }
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 2. Shutdown orchestrator (highest level component)
      await this.shutdownComponent(
        "Orchestrator",
        async () => {
          await components.orchestrator.stop();
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 3. Shutdown coordinator
      await this.shutdownComponent(
        "Coordinator",
        async () => {
          // Coordinator doesn't have explicit shutdown method, but we can cancel active coordinations
          // Implementation would depend on coordinator interface
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 4. Shutdown scheduler
      await this.shutdownComponent(
        "Scheduler",
        async () => {
          await components.scheduler.pause();
          // Clear any remaining tasks if scheduler supports it
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 5. Shutdown agent runtime
      await this.shutdownComponent(
        "AgentRuntime",
        async () => {
          // Cancel all active executions
          const executions = await components.agentRuntime.listExecutions();
          for (const execution of executions) {
            try {
              await components.agentRuntime.cancelExecution(
                execution.executionId,
              );
            } catch (error) {
              // Log but continue
              console.warn(
                `Failed to cancel execution ${execution.executionId}:`,
                error,
              );
            }
          }

          // Clean up old executions
          await components.agentRuntime.cleanup(0); // Clean all
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 6. Shutdown lifecycle manager
      await this.shutdownComponent(
        "LifecycleManager",
        async () => {
          // Get all agents from registry and shutdown each one
          const agents = await components.agentRegistry.list();
          for (const agent of agents) {
            try {
              await components.lifecycleManager.shutdown(agent.metadata.id);
            } catch (error) {
              // Log but continue with other agents
              console.warn(
                `Failed to shutdown agent lifecycle ${agent.metadata.id}:`,
                error,
              );
            }
          }
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 7. Shutdown communication manager
      await this.shutdownComponent(
        "CommunicationManager",
        async () => {
          const channels = await components.communicationManager.listChannels();
          for (const channelId of channels) {
            try {
              await components.communicationManager.removeChannel(channelId);
            } catch (error) {
              // Log but continue
              console.warn(`Failed to remove channel ${channelId}:`, error);
            }
          }
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 8. Shutdown plugin loader
      await this.shutdownComponent(
        "PluginLoader",
        async () => {
          const plugins = await components.pluginLoader.list();
          for (const plugin of plugins) {
            try {
              await components.pluginLoader.unload(plugin.id);
            } catch (error) {
              // Log but continue
              console.warn(`Failed to unload plugin ${plugin.id}:`, error);
            }
          }
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 9. Clear memory (if it has cleanup methods)
      await this.shutdownComponent(
        "Memory",
        async () => {
          // Memory clear requires a context, so we can't clear all
          // This is intentional - memory cleanup should be handled by specific agents
          console.log(
            "Memory cleanup skipped - requires context-specific clearing",
          );
        },
        shutdownOrder,
        failedShutdowns,
      );

      // 10. Clear agent registry (last)
      await this.shutdownComponent(
        "AgentRegistry",
        async () => {
          const agents = await components.agentRegistry.list();
          for (const agent of agents) {
            try {
              await components.agentRegistry.remove(agent.metadata.id);
            } catch (error) {
              // Log but continue
              console.warn(
                `Failed to remove agent ${agent.metadata.id}:`,
                error,
              );
            }
          }
        },
        shutdownOrder,
        failedShutdowns,
      );

      const totalShutdownTime = Date.now() - startTime;

      return {
        success: failedShutdowns.length === 0,
        shutdownOrder,
        failedShutdowns,
        totalShutdownTime,
      };
    } finally {
      this.shutdownInProgress = false;
    }
  }

  private async shutdownComponent(
    componentName: string,
    shutdownFn: () => Promise<void>,
    shutdownOrder: string[],
    failedShutdowns: { component: string; error: string }[],
  ): Promise<void> {
    try {
      await shutdownFn();
      shutdownOrder.push(componentName);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown shutdown error";
      failedShutdowns.push({ component: componentName, error: errorMsg });
    }
  }

  public isShutdownInProgress(): boolean {
    return this.shutdownInProgress;
  }
}
