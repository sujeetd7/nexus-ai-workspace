import { EventEmitter } from "events";
import { MCPSession, MCPSessionManager } from "../sessions";
import { DiscoveryService } from "./discovery-service";
import {
  DiscoveryResult,
  DiscoveryType,
  DiscoveryEvent,
  DiscoveryEventPayload,
  DiscoveryConfig,
  MCPServerCapabilities,
  MCPDiscoveredTool,
  MCPDiscoveredPrompt,
  MCPDiscoveredResource,
  MCPDiscoveredTemplate,
} from "./types";
import {
  DiscoveryFailedException,
  CapabilityNotFoundException,
} from "./exceptions";

export interface DiscoveryManagerConfig extends DiscoveryConfig {
  concurrentDiscoveries?: number;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export class DiscoveryManager extends EventEmitter {
  private discoveryService: DiscoveryService;
  private sessionManager: MCPSessionManager;
  private config: Required<DiscoveryManagerConfig>;
  private refreshTimer: NodeJS.Timeout | null = null;
  private activeDiscoveries = new Set<string>();

  constructor(
    sessionManager: MCPSessionManager,
    config: DiscoveryManagerConfig = {},
  ) {
    super();
    this.sessionManager = sessionManager;
    this.config = {
      cacheTtl: config.cacheTtl ?? 300000,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableLazyRefresh: config.enableLazyRefresh ?? true,
      refreshThreshold: config.refreshThreshold ?? 0.8,
      concurrentDiscoveries: config.concurrentDiscoveries ?? 10,
      refreshInterval: config.refreshInterval ?? 600000, // 10 minutes
      autoRefresh: config.autoRefresh ?? true,
    };

    this.discoveryService = new DiscoveryService(this.config);
    this.setupEventForwarding();

    if (this.config.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  async discoverServer(
    serverId: string,
    force: boolean = false,
  ): Promise<{
    capabilities: DiscoveryResult<MCPServerCapabilities>;
    tools: DiscoveryResult<MCPDiscoveredTool>;
    prompts: DiscoveryResult<MCPDiscoveredPrompt>;
    resources: DiscoveryResult<MCPDiscoveredResource>;
    templates: DiscoveryResult<MCPDiscoveredTemplate>;
  }> {
    const session = await this.getSession(serverId);
    const useCache = !force;

    // Check concurrent discovery limit
    if (this.activeDiscoveries.size >= this.config.concurrentDiscoveries) {
      throw new DiscoveryFailedException(
        serverId,
        "server",
        "Concurrent discovery limit exceeded",
      );
    }

    const discoveryId = `${serverId}:server:${Date.now()}`;
    this.activeDiscoveries.add(discoveryId);

    try {
      // Discover all types in parallel
      const [capabilities, tools, prompts, resources, templates] =
        await Promise.all([
          this.discoveryService.discoverCapabilities(session, useCache),
          this.discoveryService.discoverTools(session, useCache),
          this.discoveryService.discoverPrompts(session, useCache),
          this.discoveryService.discoverResources(session, useCache),
          this.discoveryService.discoverTemplates(session, useCache),
        ]);

      this.emitServerRefreshed(serverId);

      return { capabilities, tools, prompts, resources, templates };
    } finally {
      this.activeDiscoveries.delete(discoveryId);
    }
  }

  async discoverCapabilities(
    serverId: string,
    force: boolean = false,
  ): Promise<DiscoveryResult<MCPServerCapabilities>> {
    const session = await this.getSession(serverId);
    return this.discoveryService.discoverCapabilities(session, !force);
  }

  async discoverTools(
    serverId: string,
    force: boolean = false,
  ): Promise<DiscoveryResult<MCPDiscoveredTool>> {
    const session = await this.getSession(serverId);
    return this.discoveryService.discoverTools(session, !force);
  }

  async discoverPrompts(
    serverId: string,
    force: boolean = false,
  ): Promise<DiscoveryResult<MCPDiscoveredPrompt>> {
    const session = await this.getSession(serverId);
    return this.discoveryService.discoverPrompts(session, !force);
  }

  async discoverResources(
    serverId: string,
    force: boolean = false,
  ): Promise<DiscoveryResult<MCPDiscoveredResource>> {
    const session = await this.getSession(serverId);
    return this.discoveryService.discoverResources(session, !force);
  }

  async discoverTemplates(
    serverId: string,
    force: boolean = false,
  ): Promise<DiscoveryResult<MCPDiscoveredTemplate>> {
    const session = await this.getSession(serverId);
    return this.discoveryService.discoverTemplates(session, !force);
  }

  async refresh(serverId: string): Promise<void> {
    // Force discovery without cache
    await this.discoverServer(serverId, true);
  }

  async refreshAll(): Promise<void> {
    const sessions = this.sessionManager.getHealthySessions();
    const refreshPromises = sessions.map((session) =>
      this.refresh(session.serverId).catch((error) => {
        // Log error but don't fail the entire operation
        this.emitDiscoveryFailed(session.serverId, "refresh", 0, error.message);
      }),
    );

    await Promise.allSettled(refreshPromises);
  }

  async getServerCapabilities(
    serverId: string,
  ): Promise<MCPServerCapabilities | null> {
    const result = await this.discoverCapabilities(serverId);
    return result.success && result.data && result.data.length > 0
      ? result.data[0]
      : null;
  }

  async hasCapability(serverId: string, capability: string): Promise<boolean> {
    const capabilities = await this.getServerCapabilities(serverId);
    if (!capabilities) {
      return false;
    }

    // Check if the capability exists in the capabilities object
    return this.checkCapabilityExists(capabilities, capability);
  }

  async requireCapability(serverId: string, capability: string): Promise<void> {
    const hasCapability = await this.hasCapability(serverId, capability);
    if (!hasCapability) {
      const capabilities = await this.getServerCapabilities(serverId);
      const availableCapabilities = capabilities
        ? this.getAvailableCapabilities(capabilities)
        : [];
      throw new CapabilityNotFoundException(
        serverId,
        capability,
        availableCapabilities,
      );
    }
  }

  async getToolByName(
    serverId: string,
    toolName: string,
  ): Promise<MCPDiscoveredTool | null> {
    const result = await this.discoverTools(serverId);
    if (!result.success || !result.data) {
      return null;
    }

    return result.data.find((tool) => tool.name === toolName) || null;
  }

  async getPromptByName(
    serverId: string,
    promptName: string,
  ): Promise<MCPDiscoveredPrompt | null> {
    const result = await this.discoverPrompts(serverId);
    if (!result.success || !result.data) {
      return null;
    }

    return result.data.find((prompt) => prompt.name === promptName) || null;
  }

  async getResourceByUri(
    serverId: string,
    uri: string,
  ): Promise<MCPDiscoveredResource | null> {
    const result = await this.discoverResources(serverId);
    if (!result.success || !result.data) {
      return null;
    }

    return result.data.find((resource) => resource.uri === uri) || null;
  }

  async getTemplateByName(
    serverId: string,
    templateName: string,
  ): Promise<MCPDiscoveredTemplate | null> {
    const result = await this.discoverTemplates(serverId);
    if (!result.success || !result.data) {
      return null;
    }

    return (
      result.data.find((template) => template.name === templateName) || null
    );
  }

  invalidateCache(serverId: string, type?: DiscoveryType): void {
    this.discoveryService.invalidateCache(serverId, type);
  }

  getCacheStats() {
    return this.discoveryService.getCache().getStats();
  }

  shutdown(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.activeDiscoveries.clear();
  }

  private async getSession(serverId: string): Promise<MCPSession> {
    const session = this.sessionManager.getByServerId(serverId);
    if (!session) {
      throw new DiscoveryFailedException(
        serverId,
        "session",
        "Session not found",
      );
    }

    if (!session.isHealthy()) {
      throw new DiscoveryFailedException(
        serverId,
        "session",
        "Session is not healthy",
      );
    }

    return session;
  }

  private checkCapabilityExists(
    capabilities: MCPServerCapabilities,
    capability: string,
  ): boolean {
    const parts = capability.split(".");
    let current: any = capabilities;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return false;
      }
    }

    return current !== undefined && current !== null;
  }

  private getAvailableCapabilities(
    capabilities: MCPServerCapabilities,
  ): string[] {
    const available: string[] = [];

    const traverse = (obj: any, prefix: string = "") => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && value !== undefined) {
          available.push(fullKey);
          if (typeof value === "object" && !Array.isArray(value)) {
            traverse(value, fullKey);
          }
        }
      }
    };

    traverse(capabilities);
    return available;
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshAll();
      } catch (error) {
        // Auto-refresh errors are logged but don't stop the timer
      }
    }, this.config.refreshInterval);
  }

  private setupEventForwarding(): void {
    // Forward all discovery service events
    this.discoveryService.on(DiscoveryEvent.DISCOVERY_STARTED, (payload) => {
      this.emit(DiscoveryEvent.DISCOVERY_STARTED, payload);
    });

    this.discoveryService.on(DiscoveryEvent.DISCOVERY_COMPLETED, (payload) => {
      this.emit(DiscoveryEvent.DISCOVERY_COMPLETED, payload);
    });

    this.discoveryService.on(DiscoveryEvent.DISCOVERY_FAILED, (payload) => {
      this.emit(DiscoveryEvent.DISCOVERY_FAILED, payload);
    });

    this.discoveryService.on(DiscoveryEvent.CACHE_UPDATED, (payload) => {
      this.emit(DiscoveryEvent.CACHE_UPDATED, payload);
    });

    this.discoveryService.on(DiscoveryEvent.CACHE_INVALIDATED, (payload) => {
      this.emit(DiscoveryEvent.CACHE_INVALIDATED, payload);
    });
  }

  private emitServerRefreshed(serverId: string): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type: DiscoveryType.CAPABILITIES, // Use capabilities as the primary type
      timestamp: new Date(),
    };
    this.emit(DiscoveryEvent.SERVER_REFRESHED, payload);
  }

  private emitDiscoveryFailed(
    serverId: string,
    type: string,
    duration: number,
    error: string,
  ): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type: type as DiscoveryType,
      timestamp: new Date(),
      duration,
      error,
    };
    this.emit(DiscoveryEvent.DISCOVERY_FAILED, payload);
  }
}
