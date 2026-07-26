import { IAgent, IAgentCapability } from "../interfaces";
import { AgentType, AgentPriority } from "../types";

export enum PluginStatus {
  DISCOVERED = "discovered",
  LOADING = "loading",
  LOADED = "loaded",
  ACTIVE = "active",
  INACTIVE = "inactive",
  FAILED = "failed",
  UNLOADING = "unloading",
  UNLOADED = "unloaded"
}

export enum PluginValidationStatus {
  VALID = "valid",
  INVALID = "invalid",
  WARNING = "warning"
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  
  // Agent-specific metadata
  agentType: AgentType;
  priority: AgentPriority;
  
  // Plugin lifecycle
  createdAt: Date;
  updatedAt: Date;
  loadedAt?: Date;
  
  // Dependencies and compatibility
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engineVersion?: string;
  
  // Configuration
  configSchema?: Record<string, unknown>;
  defaultConfig?: Record<string, unknown>;
  
  metadata: Record<string, unknown>;
}

export interface PluginCapabilities {
  capabilities: IAgentCapability[];
  supportedInputTypes: string[];
  supportedOutputTypes: string[];
  requiresMemory?: boolean;
  requiresCommunication?: boolean;
  requiresWorkflow?: boolean;
  maxConcurrentExecutions?: number;
  timeoutMs?: number;
  retryAttempts?: number;
}

export interface PluginFactory {
  createAgent(config?: Record<string, unknown>): Promise<IAgent>;
  validateConfig?(config: Record<string, unknown>): Promise<boolean>;
  getDefaultConfig?(): Record<string, unknown>;
}

export interface PluginExports {
  metadata: PluginMetadata;
  capabilities: PluginCapabilities;
  factory: PluginFactory;
}

export interface PluginDescriptor {
  id: string;
  name: string;
  version: string;
  status: PluginStatus;
  metadata: PluginMetadata;
  capabilities: PluginCapabilities;
  factory: PluginFactory;
  
  // Plugin source information
  sourcePath: string;
  sourceType: "file" | "directory" | "npm" | "url";
  
  // Runtime information
  loadedAt?: Date;
  lastUsed?: Date;
  usageCount: number;
  
  // Health and metrics
  loadTime?: number;
  errors: string[];
  warnings: string[];
  
  // Associated agent instance
  agentInstance?: IAgent;
}

export interface PluginValidationResult {
  status: PluginValidationStatus;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  
  // Specific validation checks
  checks: {
    metadataValid: boolean;
    capabilitiesValid: boolean;
    factoryValid: boolean;
    configSchemaValid: boolean;
    dependenciesResolved: boolean;
    duplicateId: boolean;
    duplicateName: boolean;
    duplicateCapabilities: string[];
  };
}

export interface PluginDiscoveryOptions {
  searchPaths: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  recursive?: boolean;
  maxDepth?: number;
  followSymlinks?: boolean;
  validateOnDiscovery?: boolean;
}

export interface PluginLoadOptions {
  validateBeforeLoad?: boolean;
  autoRegister?: boolean;
  overwriteExisting?: boolean;
  timeout?: number;
  config?: Record<string, unknown>;
}

export interface PluginHealth {
  status: "healthy" | "degraded" | "unhealthy";
  totalPlugins: number;
  loadedPlugins: number;
  activePlugins: number;
  failedPlugins: number;
  
  // Performance metrics
  averageLoadTime: number;
  totalUsageCount: number;
  
  // Error tracking
  recentErrors: string[];
  recentWarnings: string[];
  
  // Resource usage
  memoryUsage: number;
  diskUsage: number;
  
  lastDiscovery?: Date;
  lastValidation?: Date;
  
  metadata: Record<string, unknown>;
}