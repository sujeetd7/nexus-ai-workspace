import { ProviderRouter } from "../providers/provider-router";

export interface ProviderHealthStatus {
  name: string;
  status: "healthy" | "unhealthy" | "unknown";
  latency?: number;
  error?: string;
  lastChecked: Date;
}

export interface SystemHealthStatus {
  overall: "healthy" | "degraded" | "unhealthy";
  providers: ProviderHealthStatus[];
  healthyCount: number;
  totalCount: number;
  lastChecked: Date;
}

export class ProviderHealthService {
  private readonly providerRouter = new ProviderRouter();
  private healthCache: Map<string, ProviderHealthStatus> = new Map();
  private cacheExpirationMs = 30000; // 30 seconds

  async health(providerName?: string): Promise<ProviderHealthStatus | SystemHealthStatus> {
    if (providerName) {
      return this.checkProviderHealth(providerName);
    } else {
      return this.checkSystemHealth();
    }
  }

  async checkProviderHealth(providerName: string): Promise<ProviderHealthStatus> {
    const cached = this.getCachedHealth(providerName);
    if (cached) {
      return cached;
    }

    const lastChecked = new Date();
    let status: ProviderHealthStatus;

    try {
      if (!this.providerRouter.hasProvider(providerName)) {
        status = {
          name: providerName,
          status: "unknown",
          error: "Provider not configured",
          lastChecked,
        };
      } else {
        const provider = this.providerRouter.getProvider(providerName);
        const start = Date.now();
        
        let healthResult: any;
        try {
          healthResult = await Promise.race([
            provider.health(),
            this.createTimeoutPromise(5000), // 5 second timeout
          ]);
        } catch (error) {
          // Handle timeout or provider errors
          status = {
            name: providerName,
            status: "unhealthy",
            latency: Date.now() - start,
            error: error instanceof Error ? error.message : 'Unknown error',
            lastChecked,
          };
          this.healthCache.set(providerName, status);
          return status;
        }

        const latency = Date.now() - start;

        if (healthResult && typeof healthResult === 'object' && 'status' in healthResult) {
          status = {
            name: providerName,
            status: (healthResult as any).status === "healthy" ? "healthy" : "unhealthy",
            latency,
            error: (healthResult as any).error,
            lastChecked,
          };
        } else if (healthResult === true) {
          status = {
            name: providerName,
            status: "healthy",
            latency,
            lastChecked,
          };
        } else {
          status = {
            name: providerName,
            status: "unhealthy",
            latency,
            error: "Health check returned false",
            lastChecked,
          };
        }
      }
    } catch (error) {
      status = {
        name: providerName,
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        lastChecked,
      };
    }

    this.cacheHealth(providerName, status);
    return status;
  }

  async checkSystemHealth(): Promise<SystemHealthStatus> {
    const availableProviders = this.providerRouter.getAvailableProviders();
    const healthPromises = availableProviders.map(provider => 
      this.checkProviderHealth(provider)
    );

    const providerStatuses = await Promise.all(healthPromises);
    const healthyCount = providerStatuses.filter(status => status.status === "healthy").length;
    const totalCount = providerStatuses.length;

    let overall: "healthy" | "degraded" | "unhealthy";
    if (healthyCount === totalCount) {
      overall = "healthy";
    } else if (healthyCount > 0) {
      overall = "degraded";
    } else {
      overall = "unhealthy";
    }

    return {
      overall,
      providers: providerStatuses,
      healthyCount,
      totalCount,
      lastChecked: new Date(),
    };
  }

  async getHealthyProviders(): Promise<string[]> {
    const systemHealth = await this.checkSystemHealth();
    return systemHealth.providers
      .filter(provider => provider.status === "healthy")
      .map(provider => provider.name);
  }

  async refreshHealthCache(): Promise<void> {
    const availableProviders = this.providerRouter.getAvailableProviders();
    
    for (const providerName of availableProviders) {
      // Remove from cache to force refresh
      this.healthCache.delete(providerName);
      // Trigger health check (will cache the result)
      await this.checkProviderHealth(providerName);
    }
  }

  private getCachedHealth(providerName: string): ProviderHealthStatus | null {
    const cached = this.healthCache.get(providerName);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const cacheTime = cached.lastChecked.getTime();
    
    if (now - cacheTime > this.cacheExpirationMs) {
      this.healthCache.delete(providerName);
      return null;
    }

    return cached;
  }

  private cacheHealth(providerName: string, status: ProviderHealthStatus): void {
    this.healthCache.set(providerName, status);
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  // Clear expired cache entries
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [providerName, status] of this.healthCache.entries()) {
      if (now - status.lastChecked.getTime() > this.cacheExpirationMs) {
        this.healthCache.delete(providerName);
      }
    }
  }

  // Start periodic cache cleanup
  public startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean every minute
  }
}