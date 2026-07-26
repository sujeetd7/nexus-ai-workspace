import { EventEmitter } from "events";
import { MCPSession } from "../sessions";
import { DiscoveryCache } from "./discovery-cache";
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
  MCPDiscoveredTemplate
} from "./types";
import {
  DiscoveryTimeoutException,
  DiscoveryFailedException,
  CapabilityNotFoundException
} from "./exceptions";

export class DiscoveryService extends EventEmitter {
  private cache: DiscoveryCache;
  private config: Required<DiscoveryConfig>;

  constructor(config: DiscoveryConfig = {}) {
    super();
    this.config = {
      cacheTtl: config.cacheTtl ?? 300000, // 5 minutes
      timeout: config.timeout ?? 30000, // 30 seconds
      retries: config.retries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      enableLazyRefresh: config.enableLazyRefresh ?? true,
      refreshThreshold: config.refreshThreshold ?? 0.8
    };

    this.cache = new DiscoveryCache(this.config.cacheTtl, this.config.refreshThreshold);
    this.setupCacheEvents();
  }

  async discoverCapabilities(session: MCPSession, useCache: boolean = true): Promise<DiscoveryResult<MCPServerCapabilities>> {
    return this.discover<MCPServerCapabilities>(
      session,
      DiscoveryType.CAPABILITIES,
      "capabilities/list",
      this.normalizeCapabilities.bind(this),
      useCache
    );
  }

  async discoverTools(session: MCPSession, useCache: boolean = true): Promise<DiscoveryResult<MCPDiscoveredTool>> {
    return this.discover<MCPDiscoveredTool>(
      session,
      DiscoveryType.TOOLS,
      "tools/list",
      this.normalizeTools.bind(this),
      useCache
    );
  }

  async discoverPrompts(session: MCPSession, useCache: boolean = true): Promise<DiscoveryResult<MCPDiscoveredPrompt>> {
    return this.discover<MCPDiscoveredPrompt>(
      session,
      DiscoveryType.PROMPTS,
      "prompts/list",
      this.normalizePrompts.bind(this),
      useCache
    );
  }

  async discoverResources(session: MCPSession, useCache: boolean = true): Promise<DiscoveryResult<MCPDiscoveredResource>> {
    return this.discover<MCPDiscoveredResource>(
      session,
      DiscoveryType.RESOURCES,
      "resources/list",
      this.normalizeResources.bind(this),
      useCache
    );
  }

  async discoverTemplates(session: MCPSession, useCache: boolean = true): Promise<DiscoveryResult<MCPDiscoveredTemplate>> {
    return this.discover<MCPDiscoveredTemplate>(
      session,
      DiscoveryType.TEMPLATES,
      "templates/list",
      this.normalizeTemplates.bind(this),
      useCache
    );
  }

  invalidateCache(serverId: string, type?: DiscoveryType): void {
    if (type) {
      this.cache.invalidate(serverId, type);
    } else {
      this.cache.invalidateServer(serverId);
    }
  }

  getCache(): DiscoveryCache {
    return this.cache;
  }

  private async discover<T>(
    session: MCPSession,
    type: DiscoveryType,
    method: string,
    normalizer: (response: any) => T[],
    useCache: boolean
  ): Promise<DiscoveryResult<T>> {
    const serverId = session.serverId;
    const startTime = Date.now();

    // Check cache first
    if (useCache) {
      const cached = this.cache.get<T>(serverId, type);
      if (cached) {
        return {
          success: true,
          data: cached,
          metadata: {
            serverId,
            discoveredAt: new Date(),
            duration: 0,
            count: cached.length,
            cached: true
          }
        };
      }
    }

    // Emit discovery started event
    this.emitDiscoveryStarted(serverId, type);

    try {
      // Make the discovery request with retries
      const response = await this.makeRequestWithRetries(session, method, {});
      const normalizedData = normalizer(response);
      const duration = Date.now() - startTime;

      // Cache the result
      if (useCache) {
        this.cache.set(serverId, type, normalizedData, this.config.cacheTtl, {
          discoveredAt: new Date(),
          duration
        });
      }

      const result: DiscoveryResult<T> = {
        success: true,
        data: normalizedData,
        metadata: {
          serverId,
          discoveredAt: new Date(),
          duration,
          count: normalizedData.length,
          cached: false
        }
      };

      this.emitDiscoveryCompleted(serverId, type, duration, normalizedData.length);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      this.emitDiscoveryFailed(serverId, type, duration, errorMessage);

      if (error instanceof DiscoveryTimeoutException || error instanceof DiscoveryFailedException) {
        throw error;
      }

      throw new DiscoveryFailedException(serverId, type, errorMessage, error instanceof Error ? error : undefined);
    }
  }

  private async makeRequestWithRetries(session: MCPSession, method: string, params: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          const timeout = setTimeout(() => {
            reject(new DiscoveryTimeoutException(session.serverId, method, this.config.timeout));
          }, this.config.timeout);
          
          // Store timeout reference to clear it if needed
          (timeoutPromise as any)._timeout = timeout;
        });

        const requestPromise = session.request(method, params);
        const response = await Promise.race([requestPromise, timeoutPromise]);
        
        // Clear timeout on successful completion
        if ((timeoutPromise as any)._timeout) {
          clearTimeout((timeoutPromise as any)._timeout);
        }
        
        return response;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (error instanceof DiscoveryTimeoutException) {
          throw error;
        }

        if (attempt < this.config.retries) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  private normalizeCapabilities(response: any): MCPServerCapabilities[] {
    if (!response || !response.capabilities) {
      return [];
    }

    // Server capabilities is typically a single object, but we return as array for consistency
    return [response.capabilities as MCPServerCapabilities];
  }

  private normalizeTools(response: any): MCPDiscoveredTool[] {
    if (!response || !Array.isArray(response.tools)) {
      return [];
    }

    return response.tools.map((tool: any) => ({
      name: tool.name || "",
      description: tool.description || "",
      inputSchema: tool.inputSchema || { type: "object", properties: {} },
      metadata: tool.metadata
    }));
  }

  private normalizePrompts(response: any): MCPDiscoveredPrompt[] {
    if (!response || !Array.isArray(response.prompts)) {
      return [];
    }

    return response.prompts.map((prompt: any) => ({
      name: prompt.name || "",
      description: prompt.description || "",
      arguments: prompt.arguments || [],
      metadata: prompt.metadata
    }));
  }

  private normalizeResources(response: any): MCPDiscoveredResource[] {
    if (!response || !Array.isArray(response.resources)) {
      return [];
    }

    return response.resources.map((resource: any) => ({
      uri: resource.uri || "",
      name: resource.name || "",
      description: resource.description,
      mimeType: resource.mimeType,
      metadata: resource.metadata
    }));
  }

  private normalizeTemplates(response: any): MCPDiscoveredTemplate[] {
    if (!response || !Array.isArray(response.templates)) {
      return [];
    }

    return response.templates.map((template: any) => ({
      name: template.name || "",
      description: template.description || "",
      arguments: template.arguments || [],
      content: template.content || "",
      metadata: template.metadata
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupCacheEvents(): void {
    this.cache.on(DiscoveryEvent.CACHE_UPDATED, (payload) => {
      this.emit(DiscoveryEvent.CACHE_UPDATED, payload);
    });

    this.cache.on(DiscoveryEvent.CACHE_INVALIDATED, (payload) => {
      this.emit(DiscoveryEvent.CACHE_INVALIDATED, payload);
    });
  }

  private emitDiscoveryStarted(serverId: string, type: DiscoveryType): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date()
    };
    this.emit(DiscoveryEvent.DISCOVERY_STARTED, payload);
  }

  private emitDiscoveryCompleted(serverId: string, type: DiscoveryType, duration: number, count: number): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date(),
      duration,
      count
    };
    this.emit(DiscoveryEvent.DISCOVERY_COMPLETED, payload);
  }

  private emitDiscoveryFailed(serverId: string, type: DiscoveryType, duration: number, error: string): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date(),
      duration,
      error
    };
    this.emit(DiscoveryEvent.DISCOVERY_FAILED, payload);
  }
}