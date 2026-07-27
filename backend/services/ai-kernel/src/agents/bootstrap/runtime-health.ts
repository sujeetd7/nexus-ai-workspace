import { IAgentRegistry } from "../interfaces";
import { IAgentRuntime } from "../runtime/agent-runtime";
import { IAgentScheduler } from "../scheduler";
import { IAgentPlanner } from "../planner";
import { IWorkflowEngine } from "../workflow";
import { IAgentCoordinator } from "../coordinator";
import { IAgentOrchestrator } from "../orchestrator";
import { IPluginLoader } from "../plugins";
import { IAgentMemory } from "../memory";
import { ICommunicationManager } from "../communication";
import { BuiltinAgentRegistry } from "../builtin/factory";

export interface RuntimeHealthComponents {
  agentRegistry?: IAgentRegistry;
  agentRuntime?: IAgentRuntime;
  scheduler?: IAgentScheduler;
  planner?: IAgentPlanner;
  workflowEngine?: IWorkflowEngine;
  coordinator?: IAgentCoordinator;
  orchestrator?: IAgentOrchestrator;
  pluginLoader?: IPluginLoader;
  memory?: IAgentMemory;
  communicationManager?: ICommunicationManager;
  builtinRegistry?: BuiltinAgentRegistry;
}

export interface ComponentHealth {
  componentName: string;
  status: "healthy" | "degraded" | "unhealthy" | "unavailable";
  details?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
  lastCheck: Date;
}

export interface AggregatedRuntimeHealth {
  overallStatus: "healthy" | "degraded" | "unhealthy";
  componentHealths: ComponentHealth[];
  summary: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
    unavailableComponents: number;
  };
  aggregatedErrors: string[];
  aggregatedWarnings: string[];
  lastHealthCheck: Date;
  uptime: number;
}

export class RuntimeHealthAggregatorException extends Error {
  public readonly name = "RuntimeHealthAggregatorException";

  constructor(message?: string) {
    super(message || "Runtime health aggregation failed");
    Object.setPrototypeOf(this, RuntimeHealthAggregatorException.prototype);
  }
}

export class RuntimeHealthAggregator {
  private readonly components: RuntimeHealthComponents;
  private readonly startTime: Date = new Date();

  constructor(components: RuntimeHealthComponents) {
    this.components = components;
  }

  public async getAggregatedHealth(): Promise<AggregatedRuntimeHealth> {
    const lastHealthCheck = new Date();
    const componentHealths: ComponentHealth[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // Check each component
    componentHealths.push(await this.checkAgentRegistry());
    componentHealths.push(await this.checkAgentRuntime());
    componentHealths.push(await this.checkScheduler());
    componentHealths.push(await this.checkPlanner());
    componentHealths.push(await this.checkWorkflowEngine());
    componentHealths.push(await this.checkCoordinator());
    componentHealths.push(await this.checkOrchestrator());
    componentHealths.push(await this.checkPluginLoader());
    componentHealths.push(await this.checkMemory());
    componentHealths.push(await this.checkCommunicationManager());
    componentHealths.push(await this.checkBuiltinRegistry());

    // Aggregate errors and warnings
    for (const health of componentHealths) {
      if (health.errors) {
        allErrors.push(...health.errors);
      }
      if (health.warnings) {
        allWarnings.push(...health.warnings);
      }
    }

    // Calculate summary
    const summary = {
      totalComponents: componentHealths.length,
      healthyComponents: componentHealths.filter((h) => h.status === "healthy")
        .length,
      degradedComponents: componentHealths.filter(
        (h) => h.status === "degraded",
      ).length,
      unhealthyComponents: componentHealths.filter(
        (h) => h.status === "unhealthy",
      ).length,
      unavailableComponents: componentHealths.filter(
        (h) => h.status === "unavailable",
      ).length,
    };

    // Determine overall status
    let overallStatus: "healthy" | "degraded" | "unhealthy";
    if (summary.unhealthyComponents > 0) {
      overallStatus = "unhealthy";
    } else if (
      summary.degradedComponents > 0 ||
      summary.unavailableComponents > 0
    ) {
      overallStatus = "degraded";
    } else {
      overallStatus = "healthy";
    }

    return {
      overallStatus,
      componentHealths,
      summary,
      aggregatedErrors: allErrors,
      aggregatedWarnings: allWarnings,
      lastHealthCheck,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  // Individual component health checks
  private async checkAgentRegistry(): Promise<ComponentHealth> {
    const componentName = "AgentRegistry";
    const lastCheck = new Date();

    if (!this.components.agentRegistry) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const agentHealths = await this.components.agentRegistry.health();
      const agentCount = await this.components.agentRegistry.count();

      // Aggregate status from all agents
      const healthStatuses = Object.values(agentHealths).map((h) => h.status);
      const hasUnhealthy = healthStatuses.includes("unhealthy");
      const hasDegraded = healthStatuses.includes("degraded");

      let overallStatus: "healthy" | "degraded" | "unhealthy";
      if (hasUnhealthy) {
        overallStatus = "unhealthy";
      } else if (hasDegraded) {
        overallStatus = "degraded";
      } else {
        overallStatus = "healthy";
      }

      const allErrors = Object.values(agentHealths).flatMap(
        (h) => h.errors || [],
      );
      const allWarnings = Object.values(agentHealths).flatMap(
        (h) => h.warnings || [],
      );

      return {
        componentName,
        status: overallStatus,
        details: {
          registeredAgents: agentCount,
          healthyAgents: healthStatuses.filter((s) => s === "healthy").length,
          degradedAgents: healthStatuses.filter((s) => s === "degraded").length,
          unhealthyAgents: healthStatuses.filter((s) => s === "unhealthy")
            .length,
        },
        errors: allErrors,
        warnings: allWarnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkAgentRuntime(): Promise<ComponentHealth> {
    const componentName = "AgentRuntime";
    const lastCheck = new Date();

    if (!this.components.agentRuntime) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      // AgentRuntime doesn't have health method, so we check basic functionality
      const executions = await this.components.agentRuntime.listExecutions();

      return {
        componentName,
        status: "healthy",
        details: {
          activeExecutions: executions.length,
          available: true,
        },
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkScheduler(): Promise<ComponentHealth> {
    const componentName = "Scheduler";
    const lastCheck = new Date();

    if (!this.components.scheduler) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.scheduler.health();

      return {
        componentName,
        status: health.status,
        details: {
          runningTasks: health.runningTasks,
          queueSizes: health.queueSizes,
          lastActivity: health.lastActivity,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkPlanner(): Promise<ComponentHealth> {
    const componentName = "Planner";
    const lastCheck = new Date();

    if (!this.components.planner) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      // Planner doesn't have health method, check basic availability
      return {
        componentName,
        status: "healthy",
        details: { available: true },
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkWorkflowEngine(): Promise<ComponentHealth> {
    const componentName = "WorkflowEngine";
    const lastCheck = new Date();

    if (!this.components.workflowEngine) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      // WorkflowEngine doesn't have health method, check basic availability
      return {
        componentName,
        status: "healthy",
        details: { available: true },
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkCoordinator(): Promise<ComponentHealth> {
    const componentName = "Coordinator";
    const lastCheck = new Date();

    if (!this.components.coordinator) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.coordinator.health();

      return {
        componentName,
        status: health.status,
        details: {
          activeCoordinations: health.activeCoordinations,
          completedCoordinations: health.completedCoordinations,
          failedCoordinations: health.failedCoordinations,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkOrchestrator(): Promise<ComponentHealth> {
    const componentName = "Orchestrator";
    const lastCheck = new Date();

    if (!this.components.orchestrator) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.orchestrator.health();

      return {
        componentName,
        status: health.status,
        details: {
          state: health.state,
          runningExecutions: health.runningExecutions,
          totalExecutions: health.totalExecutions,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkPluginLoader(): Promise<ComponentHealth> {
    const componentName = "PluginLoader";
    const lastCheck = new Date();

    if (!this.components.pluginLoader) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.pluginLoader.health();

      return {
        componentName,
        status: health.status,
        details: {
          loadedPlugins: health.loadedPlugins,
          failedPlugins: health.failedPlugins,
          totalPlugins: health.totalPlugins,
        },
        errors: health.recentErrors,
        warnings: health.recentWarnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkMemory(): Promise<ComponentHealth> {
    const componentName = "Memory";
    const lastCheck = new Date();

    if (!this.components.memory) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.memory.health();

      return {
        componentName,
        status: health.status,
        details: {
          totalSize: health.totalSize,
          usedSize: health.usedSize,
          freeSize: health.freeSize,
          lastAccess: health.lastAccess,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkCommunicationManager(): Promise<ComponentHealth> {
    const componentName = "CommunicationManager";
    const lastCheck = new Date();

    if (!this.components.communicationManager) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = await this.components.communicationManager.health();

      return {
        componentName,
        status: health.status,
        details: {
          channelCount: health.channelCount,
          registeredAgents: health.registeredAgents,
          totalMessages: health.totalMessages,
          lastActivity: health.lastActivity,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }

  private async checkBuiltinRegistry(): Promise<ComponentHealth> {
    const componentName = "BuiltinRegistry";
    const lastCheck = new Date();

    if (!this.components.builtinRegistry) {
      return {
        componentName,
        status: "unavailable",
        details: { reason: "Component not initialized" },
        lastCheck,
      };
    }

    try {
      const health = this.components.builtinRegistry.health();

      return {
        componentName,
        status: health.status,
        details: {
          registeredAgents: health.registeredAgents,
          activeAgents: health.activeAgents,
          totalUsage: health.totalUsage,
          lastActivity: health.lastActivity,
        },
        errors: health.errors,
        warnings: health.warnings,
        lastCheck,
      };
    } catch (error) {
      return {
        componentName,
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
        errors: [
          error instanceof Error ? error.message : "Health check failed",
        ],
        lastCheck,
      };
    }
  }
}
