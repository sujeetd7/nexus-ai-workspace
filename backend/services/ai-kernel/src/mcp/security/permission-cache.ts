import { EventEmitter } from "events";
import { 
  PermissionCacheEntry, 
  AuthorizationResult, 
  SecurityContext,
  SecurityEvent,
  SecurityEventPayload,
  ResourceType,
  PermissionAction
} from "./types";

export class PermissionCache extends EventEmitter {
  private cache = new Map<string, PermissionCacheEntry>();
  private defaultTtl: number;
  private maxSize: number;

  constructor(defaultTtl: number = 300000, maxSize: number = 10000) {
    super();
    this.defaultTtl = defaultTtl;
    this.maxSize = maxSize;
  }

  get(key: string): AuthorizationResult | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.emitCacheInvalidated(entry.context, key);
      return null;
    }

    // Update result to indicate it came from cache
    return {
      ...entry.result,
      metadata: {
        ...entry.result.metadata,
        cached: true
      }
    };
  }

  set(
    key: string, 
    result: AuthorizationResult, 
    context: SecurityContext, 
    ttl?: number
  ): void {
    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.maxSize) {
      this.evictOldestEntries(Math.floor(this.maxSize * 0.1)); // Evict 10%
    }

    const now = new Date();
    const effectiveTtl = ttl || this.defaultTtl;
    const expiresAt = new Date(now.getTime() + effectiveTtl);
    
    const entry: PermissionCacheEntry = {
      key,
      result,
      context,
      cachedAt: now,
      expiresAt,
      ttl: effectiveTtl
    };

    this.cache.set(key, entry);
    this.emitCacheUpdated(context, key);
  }

  invalidate(key: string): boolean {
    const entry = this.cache.get(key);
    const deleted = this.cache.delete(key);
    
    if (deleted && entry) {
      this.emitCacheInvalidated(entry.context, key);
    }
    
    return deleted;
  }

  invalidateUser(userId: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.context.userId === userId) {
        keysToDelete.push(key);
        count++;
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.emitCacheInvalidated(entry.context, key);
      }
    });

    return count;
  }

  invalidateWorkspace(workspaceId: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.context.workspaceId === workspaceId) {
        keysToDelete.push(key);
        count++;
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.emitCacheInvalidated(entry.context, key);
      }
    });

    return count;
  }

  invalidateServer(serverId: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.context.serverId === serverId) {
        keysToDelete.push(key);
        count++;
      }
    }

    keysToDelete.forEach(key => {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.emitCacheInvalidated(entry.context, key);
      }
    });

    return count;
  }

  clear(): void {
    const contexts = Array.from(this.cache.values()).map(entry => entry.context);
    const keys = Array.from(this.cache.keys());
    
    this.cache.clear();

    // Emit events for all cleared entries
    keys.forEach((key, index) => {
      if (contexts[index]) {
        this.emitCacheInvalidated(contexts[index], key);
      }
    });
  }

  isExpired(entry: PermissionCacheEntry): boolean {
    return Date.now() > entry.expiresAt.getTime();
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
        this.emitCacheInvalidated(entry.context, key);
      }
    });

    return keysToDelete.length;
  }

  getStats() {
    const now = Date.now();
    const stats = {
      totalEntries: this.cache.size,
      expiredEntries: 0,
      entriesByUser: {} as Record<string, number>,
      entriesByWorkspace: {} as Record<string, number>,
      entriesByServer: {} as Record<string, number>,
      oldestEntry: undefined as Date | undefined,
      newestEntry: undefined as Date | undefined,
      averageTtl: 0,
      hitRatio: 0 // Would need hit/miss tracking for this
    };

    let totalTtl = 0;

    for (const entry of this.cache.values()) {
      // Count expired
      if (this.isExpired(entry)) {
        stats.expiredEntries++;
      }

      // Count by user
      const userId = entry.context.userId;
      stats.entriesByUser[userId] = (stats.entriesByUser[userId] || 0) + 1;

      // Count by workspace
      const workspaceId = entry.context.workspaceId;
      stats.entriesByWorkspace[workspaceId] = (stats.entriesByWorkspace[workspaceId] || 0) + 1;

      // Count by server
      const serverId = entry.context.serverId;
      stats.entriesByServer[serverId] = (stats.entriesByServer[serverId] || 0) + 1;

      // Track oldest/newest
      if (!stats.oldestEntry || entry.cachedAt < stats.oldestEntry) {
        stats.oldestEntry = entry.cachedAt;
      }
      if (!stats.newestEntry || entry.cachedAt > stats.newestEntry) {
        stats.newestEntry = entry.cachedAt;
      }

      // Calculate average TTL
      totalTtl += entry.ttl;
    }

    stats.averageTtl = this.cache.size > 0 ? totalTtl / this.cache.size : 0;

    return stats;
  }

  generateCacheKey(
    userId: string,
    workspaceId: string,
    resource: ResourceType,
    action: PermissionAction,
    resourceId?: string,
    serverId?: string
  ): string {
    const parts = [userId, workspaceId, resource, action];
    if (resourceId) {
      parts.push(resourceId);
    }
    if (serverId) {
      parts.push(serverId);
    }
    return parts.join(":");
  }

  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.cachedAt.getTime() - b.cachedAt.getTime()
    );

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.emitCacheInvalidated(entry.context, key);
    }
  }

  private emitCacheUpdated(context: SecurityContext, key: string): void {
    // Extract resource info from context for event payload
    const payload: Partial<SecurityEventPayload> = {
      userId: context.userId,
      workspaceId: context.workspaceId,
      sessionId: context.sessionId,
      serverId: context.serverId,
      timestamp: new Date(),
      metadata: { cacheKey: key, action: "cache_updated" }
    };
    
    // Note: We don't have resource/action info in the cache context
    // This would need to be passed separately or stored in the cache entry
    this.emit("cache:updated", payload);
  }

  private emitCacheInvalidated(context: SecurityContext, key: string): void {
    const payload: Partial<SecurityEventPayload> = {
      userId: context.userId,
      workspaceId: context.workspaceId,
      sessionId: context.sessionId,
      serverId: context.serverId,
      timestamp: new Date(),
      metadata: { cacheKey: key, action: "cache_invalidated" }
    };
    
    this.emit("cache:invalidated", payload);
  }
}