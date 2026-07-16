export interface MCPServerCapabilities {
  experimental?: Record<string, unknown>;
  logging?: {
    level?: "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";
  };
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface MCPDiscoveredTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: unknown;
    }>;
    required?: string[];
    additionalProperties?: boolean;
  };
  metadata?: {
    version?: string;
    category?: string;
    tags?: string[];
    deprecated?: boolean;
    examples?: Array<{
      name: string;
      description: string;
      arguments: Record<string, unknown>;
    }>;
  };
}

export interface MCPDiscoveredPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  metadata?: {
    version?: string;
    category?: string;
    tags?: string[];
    deprecated?: boolean;
    examples?: Array<{
      name: string;
      description: string;
      arguments: Record<string, unknown>;
      output?: string;
    }>;
  };
}

export interface MCPDiscoveredResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  metadata?: {
    version?: string;
    size?: number;
    lastModified?: Date;
    tags?: string[];
    category?: string;
    permissions?: {
      read?: boolean;
      write?: boolean;
      execute?: boolean;
    };
  };
}

export interface MCPDiscoveredTemplate {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
    type?: string;
    default?: unknown;
  }>;
  content: string;
  metadata?: {
    version?: string;
    category?: string;
    tags?: string[];
    language?: string;
    format?: "text" | "markdown" | "html" | "json" | "yaml";
    examples?: Array<{
      name: string;
      description: string;
      arguments: Record<string, unknown>;
      expectedOutput?: string;
    }>;
  };
}

export interface DiscoveryResult<T> {
  success: boolean;
  data?: T[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata: {
    serverId: string;
    discoveredAt: Date;
    duration: number;
    count: number;
    cached: boolean;
  };
}

export interface DiscoveryCacheEntry<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  serverId: string;
  type: DiscoveryType;
  metadata: {
    count: number;
    discoveredAt: Date;
    duration: number;
  };
}

export enum DiscoveryType {
  CAPABILITIES = "capabilities",
  TOOLS = "tools",
  PROMPTS = "prompts",
  RESOURCES = "resources",
  TEMPLATES = "templates"
}

export enum DiscoveryEvent {
  DISCOVERY_STARTED = "discovery:started",
  DISCOVERY_COMPLETED = "discovery:completed", 
  DISCOVERY_FAILED = "discovery:failed",
  CACHE_UPDATED = "cache:updated",
  CACHE_INVALIDATED = "cache:invalidated",
  SERVER_REFRESHED = "server:refreshed"
}

export interface DiscoveryEventPayload {
  serverId: string;
  type: DiscoveryType;
  timestamp: Date;
  duration?: number;
  error?: string;
  count?: number;
}

export interface DiscoveryConfig {
  cacheTtl?: number;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableLazyRefresh?: boolean;
  refreshThreshold?: number;
}