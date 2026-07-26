import { EventEmitter } from "events";
import { MCPSessionManager } from "../sessions";
import { MCPServerRegistry } from "../registry/mcp-server-registry";
import { MCPExecutionManager } from "../manager/mcp-execution-manager";
import { MCPSecurityManager } from "../security";
import { DiscoveryManager } from "../discovery";
import {
  MCPExecutionContext,
  MCPExecutionOptions,
  MCPExecutionRequest,
  MCPExecutionResult,
  MCPBatchExecutionRequest,
  MCPBatchExecutionResult
} from "./execution-context";

export interface MCPRuntimeConfig {
  sessionManager: MCPSessionManager;
  serverRegistry: MCPServerRegistry;
  discoveryManager: DiscoveryManager;
  securityManager?: MCPSecurityManager;
  executionConfig?: {
    defaultTimeout?: number;
    defaultRetries?: number;
    maxConcurrentExecutions?: number;
    enableMetrics?: boolean;
    enableSecurity?: boolean;
  };
  healthCheckInterval?: number;
  autoRefreshServers?: boolean;
}

export interface MCPRuntimeHealth {
  status: "healthy" | "degraded" | "unhealthy";
  activeServers: number;
  activeSessions: number;
  activeExecutions: number;
  totalExecutions: number;
  errorRate: number;
  averageLatency: number;
  lastHealthCheck: Date;
  issues?: string[];
}

export class MCPRuntime extends EventEmitter {
  private sessionManager: MCPSessionManager;
  private serverRegistry: MCPServerRegistry;
  private executionManager: MCPExecutionManager;
  private securityManager?: MCPSecurityManager;
  private discoveryManager: DiscoveryManager;
  private config: MCPRuntimeConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private initialized = false;
  private shutdownInitiated = false;

  constructor(config: MCPRuntimeConfig) {
    super();
    this.config = config;
    this.sessionManager = config.sessionManager;
    this.serverRegistry = config.serverRegistry;
    this.discoveryManager = config.discoveryManager;
    this.securityManager = config.securityManager;
    
    // Create execution manager - we'll need to pass the MCPManager differently
    // For now, create a placeholder that will be properly initialized
    this.executionManager = new MCPExecutionManager(
      {} as any, // Placeholder - needs proper MCPManager
      this.securityManager,
      config.executionConfig
    );

    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error("MCP Runtime is already initialized");
    }

    try {
      // Start health checking
      if (this.config.healthCheckInterval) {
        this.startHealthCheck();
      }

      // Auto-refresh servers if enabled
      if (this.config.autoRefreshServers) {
        await this.serverRegistry.refreshAll();
      }

      this.initialized = true;
      this.emit("runtime:initialized");
    } catch (error) {
      this.emit("runtime:initialization_failed", error);
      throw new Error(`Failed to initialize MCP Runtime: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async shutdown(): Promise<void> {
    if (this.shutdownInitiated) {
      return;
    }

    this.shutdownInitiated = true;

    try {
      // Stop health checking
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      // Cancel all active executions
      await this.executionManager.cancelAll();

      // Shutdown session manager
      await this.sessionManager.shutdown();

      this.initialized = false;
      this.emit("runtime:shutdown");
    } catch (error) {
      this.emit("runtime:shutdown_failed", error);
      throw new Error(`Failed to shutdown MCP Runtime: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async execute(
    context: MCPExecutionContext,
    serverId: string,
    toolName: string,
    parameters: any,
    options?: MCPExecutionOptions
  ): Promise<MCPExecutionResult> {
    this.ensureInitialized();

    const request: MCPExecutionRequest = {
      context,
      serverId,
      toolName,
      parameters,
      options
    };

    return this.executionManager.execute(request);
  }

  async executeBatch(batchRequest: MCPBatchExecutionRequest): Promise<MCPBatchExecutionResult> {
    this.ensureInitialized();
    return this.executionManager.executeBatch(batchRequest);
  }

  async health(): Promise<MCPRuntimeHealth> {
    const now = new Date();
    const activeServers = this.serverRegistry.listActiveServers().length;
    const activeSessions = this.sessionManager.getSessionCount();
    const activeExecutions = this.executionManager.getExecutionCount();
    
    const metrics = this.executionManager.getMetrics().getGlobalMetrics();
    const issues: string[] = [];

    // Check for issues
    if (activeServers === 0) {
      issues.push("No active MCP servers");
    }

    if (activeSessions === 0 && activeServers > 0) {
      issues.push("No active sessions despite having servers");
    }

    if (metrics.successRate < 90 && metrics.totalExecutions > 10) {
      issues.push(`Low success rate: ${metrics.successRate.toFixed(1)}%`);
    }

    if (metrics.averageLatency > 10000) {
      issues.push(`High average latency: ${metrics.averageLatency.toFixed(0)}ms`);
    }

    // Determine overall status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (issues.length > 0) {
      status = issues.some(issue => 
        issue.includes("No active") || 
        issue.includes("success rate") && metrics.successRate < 50
      ) ? "unhealthy" : "degraded";
    }

    return {
      status,
      activeServers,
      activeSessions,
      activeExecutions,
      totalExecutions: metrics.totalExecutions,
      errorRate: 100 - metrics.successRate,
      averageLatency: metrics.averageLatency,
      lastHealthCheck: now,
      issues: issues.length > 0 ? issues : undefined
    };
  }

  async metrics() {
    this.ensureInitialized();
    return {
      global: this.executionManager.getMetrics().getGlobalMetrics(),
      servers: this.serverRegistry.listActiveServers().map(server => 
        this.executionManager.getMetrics().getAggregatedServerMetrics(server.server.id)
      ),
      registry: this.serverRegistry.getRegistryStats(),
      sessions: {
        total: this.sessionManager.getSessionCount(),
        healthy: this.sessionManager.getHealthySessions().length,
        unhealthy: this.sessionManager.getUnhealthySessions().length
      }
    };
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    return this.executionManager.cancel(executionId);
  }

  async cancelAllExecutions(): Promise<number> {
    return this.executionManager.cancelAll();
  }

  getActiveExecutions(): string[] {
    return this.executionManager.getActiveExecutions();
  }

  // Server management
  async refreshServer(serverId: string): Promise<void> {
    await this.serverRegistry.refreshServer(serverId);
  }

  async refreshAllServers(): Promise<void> {
    await this.serverRegistry.refreshAll();
  }

  // Registry access
  getServerRegistry(): MCPServerRegistry {
    return this.serverRegistry;
  }

  getSessionManager(): MCPSessionManager {
    return this.sessionManager;
  }

  getExecutionManager(): MCPExecutionManager {
    return this.executionManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error("MCP Runtime is not initialized. Call initialize() first.");
    }

    if (this.shutdownInitiated) {
      throw new Error("MCP Runtime is shutting down");
    }
  }

  private setupEventListeners(): void {
    // Forward execution manager events
    this.executionManager.on("execution:completed", (payload) => {
      this.emit("execution:completed", payload);
    });

    this.executionManager.on("execution:failed", (payload) => {
      this.emit("execution:failed", payload);
    });

    this.executionManager.on("execution:batch_completed", (payload) => {
      this.emit("execution:batch_completed", payload);
    });

    // Forward server registry events
    this.serverRegistry.on("server:registered", (payload) => {
      this.emit("server:registered", payload);
    });

    this.serverRegistry.on("server:removed", (payload) => {
      this.emit("server:removed", payload);
    });

    this.serverRegistry.on("server:refreshed", (payload) => {
      this.emit("server:refreshed", payload);
    });

    this.serverRegistry.on("server:error", (payload) => {
      this.emit("server:error", payload);
    });

    // Handle session manager events if it extends EventEmitter
    // (This would need to be implemented in the session manager)
  }

  private startHealthCheck(): void {
    const interval = this.config.healthCheckInterval || 60000; // Default 1 minute
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.health();
        this.emit("runtime:health_check", health);

        // Emit warnings for degraded health
        if (health.status !== "healthy") {
          this.emit("runtime:health_warning", health);
        }
      } catch (error) {
        this.emit("runtime:health_check_failed", error);
      }
    }, interval);
  }
}