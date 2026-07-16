import { EventEmitter } from "events";
import { 
  DiscoveryCacheEntry, 
  DiscoveryType, 
  DiscoveryEvent, 
  DiscoveryEventPayload,
  MCPServerCapabilities,
  MCPDiscoveredTool,
  MCPDiscoveredPrompt,
  MCPDiscoveredResource,
  MCPDiscoveredTemplate
} from "./types";

export class DiscoveryCache extends EventEmitter {
  private cache = new Map<string, DiscoveryCacheEntry<any>>();
  private defaultTtl: number;
  private lazyRefreshThreshold: number;

  constructor(defaultTtl: number = 300000, lazyRefreshThreshold: number = 0.8) {
    super();
    this.defaultTtl = defaultTtl;
    this.lazyRefreshThreshold = lazyRefreshThreshold;
  }

  get<T>(serverId: string, type: DiscoveryType): T[] | null {
    const key = this.getCacheKey(serverId, type);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.emitCacheInvalidated(serverId, type);
      return null;
    }

    // Check if we should trigger lazy refresh
    if (this.shouldLazyRefresh(entry)) {
      this.emitLazyRefreshNeeded(serverId, type);
    }

    return entry.data;
  }

  set<T>(
    serverId: string, 
    type: DiscoveryType, 
    data: T[], 
    ttl?: number,
    metadata?: {
      discoveredAt: Date;
      duration: number;
    }
  ): void {
    const key = this.getCacheKey(serverId, type);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTtl));
    
    const entry: DiscoveryCacheEntry<T[]> = {
      data,
      cachedAt: now,
      expiresAt,
      serverId,
      type,
      metadata: {
        count: data.length,
        discoveredAt: metadata?.discoveredAt || now,
        duration: metadata?.duration || 0
      }
    };

    this.cache.set(key, entry);
    this.emitCacheUpdated(serverId, type, entry.metadata.count);
  }

  invalidate(serverId: string, type: DiscoveryType): boolean {
    const key = this.getCacheKey(serverId, type);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      this.emitCacheInvalidated(serverId, type);
    }
    
    return deleted;
  }

  invalidateServer(serverId: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.serverId === serverId) {
        keysToDelete.push(key);
        count++;
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.emitCacheInvalidated(serverId, entry.type);
      }
    });

    return count;
  }

  clear(): void {
    const servers = new Set<string>();
    const types = new Set<DiscoveryType>();
    
    for (const entry of this.cache.values()) {
      servers.add(entry.serverId);
      types.add(entry.type);
    }

    this.cache.clear();

    // Emit events for all cleared entries
    for (const serverId of servers) {
      for (const type of types) {
        this.emitCacheInvalidated(serverId, type);
      }
    }
  }

  isExpired(entry: DiscoveryCacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt.getTime();
  }

  shouldLazyRefresh(entry: DiscoveryCacheEntry<any>): boolean {
    const now = Date.now();
    const totalTtl = entry.expiresAt.getTime() - entry.cachedAt.getTime();
    const elapsed = now - entry.cachedAt.getTime();
    const progress = elapsed / totalTtl;
    
    return progress >= this.lazyRefreshThreshold;
  }

  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    entriesByServer: Record<string, number>;
    entriesByType: Record<DiscoveryType, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    const stats = {
      totalEntries: this.cache.size,
      expiredEntries: 0,
      entriesByServer: {} as Record<string, number>,
      entriesByType: {} as Record<DiscoveryType, number>,
      oldestEntry: undefined as Date | undefined,
      newestEntry: undefined as Date | undefined
    };

    for (const entry of this.cache.values()) {
      // Count expired
      if (this.isExpired(entry)) {
        stats.expiredEntries++;
      }

      // Count by server
      stats.entriesByServer[entry.serverId] = (stats.entriesByServer[entry.serverId] || 0) + 1;

      // Count by type
      stats.entriesByType[entry.type] = (stats.entriesByType[entry.type] || 0) + 1;

      // Track oldest/newest
      if (!stats.oldestEntry || entry.cachedAt < stats.oldestEntry) {
        stats.oldestEntry = entry.cachedAt;
      }
      if (!stats.newestEntry || entry.cachedAt > stats.newestEntry) {
        stats.newestEntry = entry.cachedAt;
      }
    }

    return stats;
  }

  cleanupExpired(): number {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.emitCacheInvalidated(entry.serverId, entry.type);
      }
    });

    return keysToDelete.length;
  }

  getServerEntries(serverId: string): DiscoveryCacheEntry<any>[] {
    const entries: DiscoveryCacheEntry<any>[] = [];
    
    for (const entry of this.cache.values()) {
      if (entry.serverId === serverId) {
        entries.push(entry);
      }
    }

    return entries;
  }

  hasValidEntry(serverId: string, type: DiscoveryType): boolean {
    const key = this.getCacheKey(serverId, type);
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  private getCacheKey(serverId: string, type: DiscoveryType): string {
    return `${serverId}:${type}`;
  }

  private emitCacheUpdated(serverId: string, type: DiscoveryType, count: number): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date(),
      count
    };
    this.emit(DiscoveryEvent.CACHE_UPDATED, payload);
  }

  private emitCacheInvalidated(serverId: string, type: DiscoveryType): void {
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date()
    };
    this.emit(DiscoveryEvent.CACHE_INVALIDATED, payload);
  }

  private emitLazyRefreshNeeded(serverId: string, type: DiscoveryType): void {
    // Custom event for lazy refresh (not in the original requirements but useful)
    const payload: DiscoveryEventPayload = {
      serverId,
      type,
      timestamp: new Date()
    };
    this.emit("cache:refresh_needed", payload);
  }
}