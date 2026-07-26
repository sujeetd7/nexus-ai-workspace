import { 
  PluginDescriptor, 
  PluginDiscoveryOptions, 
  PluginLoadOptions, 
  PluginValidationResult 
} from "../../plugins";

export enum PluginOperation {
  DISCOVER = "discover",
  LOAD = "load",
  UNLOAD = "unload",
  RELOAD = "reload",
  VALIDATE = "validate",
  LIST = "list"
}

export interface PluginOperationRequest {
  operation: PluginOperation;
  metadata?: Record<string, unknown>;
}

export interface PluginDiscoverRequest extends PluginOperationRequest {
  operation: PluginOperation.DISCOVER;
  discoveryOptions: PluginDiscoveryOptions;
}

export interface PluginLoadRequest extends PluginOperationRequest {
  operation: PluginOperation.LOAD;
  pluginId: string;
  loadOptions?: PluginLoadOptions;
}

export interface PluginUnloadRequest extends PluginOperationRequest {
  operation: PluginOperation.UNLOAD;
  pluginId: string;
}

export interface PluginReloadRequest extends PluginOperationRequest {
  operation: PluginOperation.RELOAD;
  pluginId: string;
  loadOptions?: PluginLoadOptions;
}

export interface PluginValidateRequest extends PluginOperationRequest {
  operation: PluginOperation.VALIDATE;
  pluginId: string;
}

export interface PluginListRequest extends PluginOperationRequest {
  operation: PluginOperation.LIST;
}

export interface PluginOperationResult {
  success: boolean;
  operation: PluginOperation;
  error?: string;
  metadata: Record<string, unknown>;
}

export interface PluginDiscoverResult extends PluginOperationResult {
  operation: PluginOperation.DISCOVER;
  discoveredPlugins: PluginDescriptor[];
  discoveredCount: number;
  discoveredAt: Date;
}

export interface PluginLoadResult extends PluginOperationResult {
  operation: PluginOperation.LOAD;
  pluginId: string;
  pluginDescriptor?: PluginDescriptor;
  loadedAt: Date;
}

export interface PluginUnloadResult extends PluginOperationResult {
  operation: PluginOperation.UNLOAD;
  pluginId: string;
  unloaded: boolean;
  unloadedAt: Date;
}

export interface PluginReloadResult extends PluginOperationResult {
  operation: PluginOperation.RELOAD;
  pluginId: string;
  pluginDescriptor?: PluginDescriptor;
  reloadedAt: Date;
}

export interface PluginValidateResult extends PluginOperationResult {
  operation: PluginOperation.VALIDATE;
  pluginId: string;
  valid: boolean;
  validationResult?: PluginValidationResult;
  validatedAt: Date;
}

export interface PluginListResult extends PluginOperationResult {
  operation: PluginOperation.LIST;
  plugins: PluginDescriptor[];
  pluginCount: number;
  listedAt: Date;
}

export interface PluginAgentHealth {
  registryAvailable: boolean;
  loaderAvailable: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  totalPlugins: number;
  loadedPlugins: number;
  activePlugins: number;
  failedPlugins: number;
  errors: string[];
  warnings: string[];
  lastActivity?: Date;
  metadata: Record<string, unknown>;
}

export interface PluginAgentMetrics {
  operationCounts: Record<PluginOperation, number>;
  successCounts: Record<PluginOperation, number>;
  errorCounts: Record<PluginOperation, number>;
  averageLatencies: Record<PluginOperation, number>;
  
  totalOperations: number;
  successRate: number;
  uptime: number;
  
  pluginStats: {
    totalPlugins: number;
    discoveredPlugins: number;
    loadedPlugins: number;
    activePlugins: number;
    failedPlugins: number;
    averageLoadTime: number;
    totalDiscoveries: number;
    totalLoads: number;
    totalUnloads: number;
    totalReloads: number;
    totalValidations: number;
  };
  
  operationStats: {
    discoverySuccessRate: number;
    loadSuccessRate: number;
    unloadSuccessRate: number;
    reloadSuccessRate: number;
    validationSuccessRate: number;
    averagePluginsPerDiscovery: number;
    pluginUsageStats: Record<string, {
      usageCount: number;
      lastUsed?: Date;
      averageLoadTime?: number;
    }>;
  };
}