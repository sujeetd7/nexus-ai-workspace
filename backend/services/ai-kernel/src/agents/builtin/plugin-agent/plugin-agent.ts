import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext
} from "../../interfaces";
import { AgentType, AgentStatus, AgentPriority, AgentHealth, ExecutionResult, ExecutionStatus } from "../../types";
import {
  PluginOperation,
  PluginOperationRequest,
  PluginDiscoverRequest,
  PluginLoadRequest,
  PluginUnloadRequest,
  PluginReloadRequest,
  PluginValidateRequest,
  PluginListRequest,
  PluginOperationResult,
  PluginDiscoverResult,
  PluginLoadResult,
  PluginUnloadResult,
  PluginReloadResult,
  PluginValidateResult,
  PluginListResult,
  PluginAgentHealth,
  PluginAgentMetrics
} from "./plugin-agent.types";
import {
  PluginAgentException,
  InvalidPluginOperationException,
  PluginDiscoveryAgentException,
  PluginLoadAgentException,
  PluginUnloadAgentException,
  PluginReloadAgentException,
  PluginValidationAgentException,
  PluginListAgentException,
  PluginRegistryUnavailableException,
  PluginLoaderUnavailableException,
  InvalidPluginDiscoveryOptionsException
} from "./plugin-agent.exceptions";
import { IPluginRegistry } from "../../plugins/plugin-registry";
import { IPluginLoader } from "../../plugins/plugin-loader";

export interface PluginAgentComponents {
  pluginRegistry: IPluginRegistry;
  pluginLoader: IPluginLoader;
}

export class PluginAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];
  
  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();
  
  // Plugin components
  private readonly components: PluginAgentComponents;
  
  // Metrics
  private readonly operationCounts: Record<PluginOperation, number> = {} as Record<PluginOperation, number>;
  private readonly successCounts: Record<PluginOperation, number> = {} as Record<PluginOperation, number>;
  private readonly errorCounts: Record<PluginOperation, number> = {} as Record<PluginOperation, number>;
  private readonly latencies: Record<PluginOperation, number[]> = {} as Record<PluginOperation, number[]>;
  
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;
  
  // Plugin tracking
  private totalPlugins = 0;
  private totalDiscoveries = 0;
  private totalLoads = 0;
  private totalUnloads = 0;
  private totalReloads = 0;
  private totalValidations = 0;
  private discoveryAttempts = 0;
  private totalPluginsDiscovered = 0;
  private pluginUsageStats: Record<string, { usageCount: number; lastUsed?: Date; averageLoadTime?: number; }> = {};

  constructor(components: PluginAgentComponents) {
    this.metadata = {
      id: "plugin-agent",
      name: "Plugin Agent",
      description: "Built-in agent for plugin management operations using the existing PluginRegistry and PluginLoader infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["plugin", "builtin", "management"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.capabilities = [
      {
        id: "plugin-discovery",
        name: "Plugin Discovery",
        description: "Discover plugins from specified search paths with filtering and validation",
        inputSchema: { operation: "string", discoveryOptions: "object" },
        outputSchema: { success: "boolean", discoveredPlugins: "array" },
        parameters: { timeout: 60000 },
        dependencies: []
      },
      {
        id: "plugin-lifecycle",
        name: "Plugin Lifecycle Management", 
        description: "Load, unload, and reload plugins with dependency resolution and validation",
        inputSchema: { operation: "string", pluginId: "string", loadOptions: "object" },
        outputSchema: { success: "boolean", pluginDescriptor: "object" },
        parameters: { timeout: 30000 },
        dependencies: []
      },
      {
        id: "plugin-validation",
        name: "Plugin Validation",
        description: "Validate plugin integrity, dependencies, and compatibility",
        inputSchema: { operation: "string", pluginId: "string" },
        outputSchema: { success: "boolean", valid: "boolean", validationResult: "object" },
        parameters: {},
        dependencies: []
      },
      {
        id: "plugin-management",
        name: "Plugin Management",
        description: "List and manage registered plugins with status and metadata",
        inputSchema: { operation: "string" },
        outputSchema: { success: "boolean", plugins: "array" },
        parameters: {},
        dependencies: []
      }
    ];

    this.components = components;

    // Initialize metrics
    this.initializeMetrics();

    this.agentHealth = {
      status: "healthy",
      uptime: 0,
      lastHeartbeat: new Date(),
      memoryUsage: 0,
      cpuUsage: 0,
      errors: [],
      warnings: [],
      metrics: {}
    };
  }

  public get status(): AgentStatus {
    return this.agentStatus;
  }

  public get health(): AgentHealth {
    return this.agentHealth;
  }

  public async initialize(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.INITIALIZING;
      
      // Validate components
      if (!this.components.pluginRegistry) {
        throw new PluginRegistryUnavailableException();
      }
      
      if (!this.components.pluginLoader) {
        throw new PluginLoaderUnavailableException();
      }
      
      this.agentStatus = AgentStatus.IDLE;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize plugin agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new PluginAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;
      
      // Cleanup resources if needed
      // Plugin registry and loader don't require special cleanup
      
      this.agentStatus = AgentStatus.STOPPED;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown plugin agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new PluginAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      
      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.pluginRegistry || !this.components.pluginLoader) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      this.agentHealth = {
        status,
        uptime,
        lastHeartbeat: new Date(),
        memoryUsage: 0, // Placeholder
        cpuUsage: 0, // Placeholder
        errors: [...this.errors],
        warnings: [...this.warnings],
        metrics: {
          totalPlugins: this.totalPlugins,
          totalOperations: Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0),
          successRate: this.calculateSuccessRate()
        }
      };
      
      return this.agentHealth;
      
    } catch (error) {
      const errorMsg = `Failed to get plugin agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        status: "unhealthy",
        uptime: Date.now() - this.startTime.getTime(),
        lastHeartbeat: new Date(),
        memoryUsage: 0,
        cpuUsage: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        metrics: { error: 1 }
      };
    }
  }

  public async updateStatus(status: AgentStatus): Promise<void> {
    this.agentStatus = status;
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.some(cap => cap.id === capabilityId);
  }

  public getCapability(capabilityId: string): IAgentCapability | undefined {
    return this.capabilities.find(cap => cap.id === capabilityId);
  }

  public listCapabilities(): IAgentCapability[] {
    return [...this.capabilities];
  }

  // Main execution method - determines which operation to execute based on input
  public async execute(input: unknown, context: IAgentExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.lastActivity = new Date();
    
    try {
      // Validate input
      const request = this.validateAndParseRequest(input);
      
      // Record operation attempt
      this.recordOperationAttempt(request.operation);
      
      // Execute operation
      let result: PluginOperationResult;
      
      switch (request.operation) {
        case PluginOperation.DISCOVER:
          result = await this.discoverPlugins(request as PluginDiscoverRequest, context);
          break;
        case PluginOperation.LOAD:
          result = await this.loadPlugin(request as PluginLoadRequest, context);
          break;
        case PluginOperation.UNLOAD:
          result = await this.unloadPlugin(request as PluginUnloadRequest, context);
          break;
        case PluginOperation.RELOAD:
          result = await this.reloadPlugin(request as PluginReloadRequest, context);
          break;
        case PluginOperation.VALIDATE:
          result = await this.validatePlugin(request as PluginValidateRequest, context);
          break;
        case PluginOperation.LIST:
          result = await this.listPlugins(request as PluginListRequest, context);
          break;
        default:
          throw new InvalidPluginOperationException(request.operation as string, "Unsupported operation");
      }
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordOperationSuccess(request.operation, duration);
      
      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: result.success,
        output: result,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: result.error ? [result.error] : [],
        status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        metadata: {
          operation: request.operation,
          ...result.metadata
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown execution error';
      
      // Record error
      if (input && typeof input === 'object' && 'operation' in input) {
        this.recordOperationError(input.operation as PluginOperation, duration);
      }
      
      this.errors.push(errorMsg);
      
      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: false,
        output: undefined,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: [errorMsg],
        status: ExecutionStatus.FAILED,
        metadata: { error: errorMsg }
      };
    }
  }

  // Individual plugin operations
  public async discoverPlugins(request: PluginDiscoverRequest, context: IAgentExecutionContext): Promise<PluginDiscoverResult> {
    const discoveredAt = new Date();
    
    try {
      // Validate discovery options
      this.validateDiscoveryOptions(request.discoveryOptions);
      
      // Discover using existing loader
      const discoveredPlugins = await this.components.pluginLoader.discover(request.discoveryOptions);
      
      this.totalDiscoveries++;
      this.discoveryAttempts++;
      this.totalPluginsDiscovered += discoveredPlugins.length;
      
      return {
        success: true,
        operation: PluginOperation.DISCOVER,
        discoveredPlugins,
        discoveredCount: discoveredPlugins.length,
        discoveredAt,
        metadata: {
          discoveredCount: discoveredPlugins.length,
          searchPaths: request.discoveryOptions.searchPaths,
          includePatterns: request.discoveryOptions.includePatterns,
          excludePatterns: request.discoveryOptions.excludePatterns,
          timestamp: discoveredAt
        }
      };
      
    } catch (error) {
      this.discoveryAttempts++;
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin discovery error";
      throw new PluginDiscoveryAgentException(request.discoveryOptions.searchPaths, errorMsg);
    }
  }

  public async loadPlugin(request: PluginLoadRequest, context: IAgentExecutionContext): Promise<PluginLoadResult> {
    const loadedAt = new Date();
    
    try {
      // Load using existing loader
      const pluginDescriptor = await this.components.pluginLoader.load(request.pluginId, request.loadOptions);
      
      this.totalLoads++;
      this.totalPlugins++;
      
      // Update usage stats
      if (!this.pluginUsageStats[request.pluginId]) {
        this.pluginUsageStats[request.pluginId] = { usageCount: 0 };
      }
      this.pluginUsageStats[request.pluginId].usageCount++;
      this.pluginUsageStats[request.pluginId].lastUsed = loadedAt;
      if (pluginDescriptor.loadTime) {
        const currentAvg = this.pluginUsageStats[request.pluginId].averageLoadTime || 0;
        const count = this.pluginUsageStats[request.pluginId].usageCount;
        this.pluginUsageStats[request.pluginId].averageLoadTime = 
          (currentAvg * (count - 1) + pluginDescriptor.loadTime) / count;
      }
      
      return {
        success: true,
        operation: PluginOperation.LOAD,
        pluginId: request.pluginId,
        pluginDescriptor,
        loadedAt,
        metadata: {
          pluginId: request.pluginId,
          pluginName: pluginDescriptor.name,
          pluginVersion: pluginDescriptor.version,
          loadTime: pluginDescriptor.loadTime,
          timestamp: loadedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin load error";
      throw new PluginLoadAgentException(request.pluginId, errorMsg);
    }
  }

  public async unloadPlugin(request: PluginUnloadRequest, context: IAgentExecutionContext): Promise<PluginUnloadResult> {
    const unloadedAt = new Date();
    
    try {
      // Unload using existing loader
      const unloaded = await this.components.pluginLoader.unload(request.pluginId);
      
      if (unloaded) {
        this.totalUnloads++;
        this.totalPlugins = Math.max(0, this.totalPlugins - 1);
      }
      
      return {
        success: true,
        operation: PluginOperation.UNLOAD,
        pluginId: request.pluginId,
        unloaded,
        unloadedAt,
        metadata: {
          pluginId: request.pluginId,
          unloaded,
          timestamp: unloadedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin unload error";
      throw new PluginUnloadAgentException(request.pluginId, errorMsg);
    }
  }

  public async reloadPlugin(request: PluginReloadRequest, context: IAgentExecutionContext): Promise<PluginReloadResult> {
    const reloadedAt = new Date();
    
    try {
      // Reload using existing loader
      const pluginDescriptor = await this.components.pluginLoader.reload(request.pluginId, request.loadOptions);
      
      this.totalReloads++;
      
      // Update usage stats
      if (!this.pluginUsageStats[request.pluginId]) {
        this.pluginUsageStats[request.pluginId] = { usageCount: 0 };
      }
      this.pluginUsageStats[request.pluginId].usageCount++;
      this.pluginUsageStats[request.pluginId].lastUsed = reloadedAt;
      if (pluginDescriptor.loadTime) {
        const currentAvg = this.pluginUsageStats[request.pluginId].averageLoadTime || 0;
        const count = this.pluginUsageStats[request.pluginId].usageCount;
        this.pluginUsageStats[request.pluginId].averageLoadTime = 
          (currentAvg * (count - 1) + pluginDescriptor.loadTime) / count;
      }
      
      return {
        success: true,
        operation: PluginOperation.RELOAD,
        pluginId: request.pluginId,
        pluginDescriptor,
        reloadedAt,
        metadata: {
          pluginId: request.pluginId,
          pluginName: pluginDescriptor.name,
          pluginVersion: pluginDescriptor.version,
          loadTime: pluginDescriptor.loadTime,
          timestamp: reloadedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin reload error";
      throw new PluginReloadAgentException(request.pluginId, errorMsg);
    }
  }

  public async validatePlugin(request: PluginValidateRequest, context: IAgentExecutionContext): Promise<PluginValidateResult> {
    const validatedAt = new Date();
    
    try {
      // Validate using existing loader
      const valid = await this.components.pluginLoader.validate(request.pluginId);
      
      // Get detailed validation result from registry
      const validationResult = await this.components.pluginRegistry.validate(request.pluginId);
      
      this.totalValidations++;
      
      return {
        success: true,
        operation: PluginOperation.VALIDATE,
        pluginId: request.pluginId,
        valid,
        validationResult,
        validatedAt,
        metadata: {
          pluginId: request.pluginId,
          valid,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          timestamp: validatedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin validation error";
      throw new PluginValidationAgentException(request.pluginId, [errorMsg]);
    }
  }

  public async listPlugins(request: PluginListRequest, context: IAgentExecutionContext): Promise<PluginListResult> {
    const listedAt = new Date();
    
    try {
      // List using existing loader
      const plugins = await this.components.pluginLoader.list();
      
      return {
        success: true,
        operation: PluginOperation.LIST,
        plugins,
        pluginCount: plugins.length,
        listedAt,
        metadata: {
          pluginCount: plugins.length,
          statusBreakdown: this.getStatusBreakdown(plugins),
          timestamp: listedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plugin listing error";
      throw new PluginListAgentException(errorMsg);
    }
  }

  public async getPluginAgentHealth(): Promise<PluginAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.pluginRegistry || !this.components.pluginLoader) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      // Get plugin counts from registry
      let totalPlugins = 0;
      let loadedPlugins = 0;
      let activePlugins = 0;
      let failedPlugins = 0;
      
      try {
        const plugins = await this.components.pluginLoader.list();
        totalPlugins = plugins.length;
        loadedPlugins = plugins.filter(p => p.status === 'loaded' || p.status === 'active').length;
        activePlugins = plugins.filter(p => p.status === 'active').length;
        failedPlugins = plugins.filter(p => p.status === 'failed').length;
      } catch {
        // Ignore errors when getting plugin counts for health check
      }
      
      return {
        registryAvailable: !!this.components.pluginRegistry,
        loaderAvailable: !!this.components.pluginLoader,
        status,
        totalPlugins,
        loadedPlugins,
        activePlugins,
        failedPlugins,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          totalDiscoveries: this.totalDiscoveries,
          totalLoads: this.totalLoads,
          totalUnloads: this.totalUnloads,
          totalReloads: this.totalReloads,
          totalValidations: this.totalValidations,
          discoverySuccessRate: this.discoveryAttempts > 0 ? this.totalDiscoveries / this.discoveryAttempts : 0,
          pluginUsageStats: { ...this.pluginUsageStats }
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to get plugin agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        registryAvailable: false,
        loaderAvailable: false,
        status: "unhealthy",
        totalPlugins: 0,
        loadedPlugins: 0,
        activePlugins: 0,
        failedPlugins: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg }
      };
    }
  }

  public getMetrics(): PluginAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    
    // Calculate average latencies
    const averageLatencies: Record<PluginOperation, number> = {} as Record<PluginOperation, number>;
    Object.keys(this.latencies).forEach(op => {
      const operation = op as PluginOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });
    
    // Calculate average load time
    const loadTimes = Object.values(this.pluginUsageStats)
      .map(stats => stats.averageLoadTime || 0)
      .filter(time => time > 0);
    const averageLoadTime = loadTimes.length > 0 ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0;
    
    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      pluginStats: {
        totalPlugins: this.totalPlugins,
        discoveredPlugins: this.totalPluginsDiscovered,
        loadedPlugins: this.successCounts[PluginOperation.LOAD] || 0,
        activePlugins: 0, // Would need to track this from registry
        failedPlugins: this.errorCounts[PluginOperation.LOAD] || 0,
        averageLoadTime,
        totalDiscoveries: this.totalDiscoveries,
        totalLoads: this.totalLoads,
        totalUnloads: this.totalUnloads,
        totalReloads: this.totalReloads,
        totalValidations: this.totalValidations
      },
      operationStats: {
        discoverySuccessRate: this.calculateOperationSuccessRate(PluginOperation.DISCOVER),
        loadSuccessRate: this.calculateOperationSuccessRate(PluginOperation.LOAD),
        unloadSuccessRate: this.calculateOperationSuccessRate(PluginOperation.UNLOAD),
        reloadSuccessRate: this.calculateOperationSuccessRate(PluginOperation.RELOAD),
        validationSuccessRate: this.calculateOperationSuccessRate(PluginOperation.VALIDATE),
        averagePluginsPerDiscovery: this.totalDiscoveries > 0 ? this.totalPluginsDiscovered / this.totalDiscoveries : 0,
        pluginUsageStats: { ...this.pluginUsageStats }
      }
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): PluginOperationRequest {
    if (!input || typeof input !== 'object') {
      throw new InvalidPluginOperationException("unknown", "Input must be an object");
    }
    
    const request = input as Record<string, unknown>;
    
    if (!request.operation || typeof request.operation !== 'string') {
      throw new InvalidPluginOperationException("unknown", "Operation is required and must be a string");
    }
    
    if (!Object.values(PluginOperation).includes(request.operation as PluginOperation)) {
      throw new InvalidPluginOperationException(request.operation as string, "Unsupported operation");
    }
    
    // Validate operation-specific requirements
    const operation = request.operation as PluginOperation;
    
    if (operation === PluginOperation.DISCOVER) {
      if (!request.discoveryOptions || typeof request.discoveryOptions !== 'object') {
        throw new InvalidPluginOperationException(operation, "Discovery options are required for discover operation");
      }
    }
    
    if ([PluginOperation.LOAD, PluginOperation.UNLOAD, PluginOperation.RELOAD, PluginOperation.VALIDATE].includes(operation)) {
      if (!request.pluginId || typeof request.pluginId !== 'string') {
        throw new InvalidPluginOperationException(operation, "Plugin ID is required for plugin-specific operations");
      }
    }
    
    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request
    } as PluginOperationRequest;
  }

  private validateDiscoveryOptions(options: any): void {
    if (!Array.isArray(options.searchPaths) || options.searchPaths.length === 0) {
      throw new InvalidPluginDiscoveryOptionsException(['searchPaths']);
    }
    
    // Validate each search path is a string
    const invalidPaths = options.searchPaths.filter((path: any) => typeof path !== 'string');
    if (invalidPaths.length > 0) {
      throw new InvalidPluginDiscoveryOptionsException(['searchPaths (must be strings)']);
    }
    
    // Optional validation for include patterns
    if (options.includePatterns !== undefined && !Array.isArray(options.includePatterns)) {
      throw new InvalidPluginDiscoveryOptionsException(['includePatterns (must be array if provided)']);
    }
    
    // Optional validation for exclude patterns
    if (options.excludePatterns !== undefined && !Array.isArray(options.excludePatterns)) {
      throw new InvalidPluginDiscoveryOptionsException(['excludePatterns (must be array if provided)']);
    }
  }

  private getStatusBreakdown(plugins: any[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    plugins.forEach(plugin => {
      const status = plugin.status || 'unknown';
      breakdown[status] = (breakdown[status] || 0) + 1;
    });
    return breakdown;
  }

  private initializeMetrics(): void {
    Object.values(PluginOperation).forEach(operation => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: PluginOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(operation: PluginOperation, duration: number): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(operation: PluginOperation, duration: number): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }

  private calculateOperationSuccessRate(operation: PluginOperation): number {
    const totalOps = this.operationCounts[operation];
    const successOps = this.successCounts[operation];
    return totalOps > 0 ? successOps / totalOps : 0;
  }
}