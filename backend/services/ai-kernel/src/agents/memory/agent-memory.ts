import { MemoryContext } from "./memory-context";

export interface MemoryHealth {
  status: "healthy" | "degraded" | "unhealthy";
  totalSize: number;
  usedSize: number;
  freeSize: number;
  errors: string[];
  warnings: string[];
  lastAccess: Date;
  metadata: Record<string, unknown>;
}

export interface IAgentMemory<T = unknown> {
  load(key: string, context: MemoryContext): Promise<T | undefined>;
  save(key: string, value: T, context: MemoryContext): Promise<void>;
  clear(context: MemoryContext): Promise<void>;
  exists(key: string, context: MemoryContext): Promise<boolean>;
  size(context: MemoryContext): Promise<number>;
  health(): Promise<MemoryHealth>;
}

export abstract class BaseAgentMemory<T = unknown> implements IAgentMemory<T> {
  protected readonly storage: Map<string, T> = new Map();
  protected readonly accessLog: Map<string, Date> = new Map();
  protected readonly errors: string[] = [];
  protected readonly warnings: string[] = [];

  public async load(
    key: string,
    context: MemoryContext,
  ): Promise<T | undefined> {
    try {
      const fullKey = this.buildKey(key, context);
      const value = this.storage.get(fullKey);

      if (value !== undefined) {
        this.accessLog.set(fullKey, new Date());
      }

      return value;
    } catch (error) {
      const errorMsg = `Failed to load memory key '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async save(
    key: string,
    value: T,
    context: MemoryContext,
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, context);
      this.storage.set(fullKey, value);
      this.accessLog.set(fullKey, new Date());
    } catch (error) {
      const errorMsg = `Failed to save memory key '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async clear(context: MemoryContext): Promise<void> {
    try {
      const prefix = this.buildKeyPrefix(context);
      const keysToDelete: string[] = [];

      for (const key of this.storage.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        this.storage.delete(key);
        this.accessLog.delete(key);
      }
    } catch (error) {
      const errorMsg = `Failed to clear memory: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async exists(key: string, context: MemoryContext): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, context);
      return this.storage.has(fullKey);
    } catch (error) {
      const errorMsg = `Failed to check memory key existence '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async size(context: MemoryContext): Promise<number> {
    try {
      const prefix = this.buildKeyPrefix(context);
      let count = 0;

      for (const key of this.storage.keys()) {
        if (key.startsWith(prefix)) {
          count++;
        }
      }

      return count;
    } catch (error) {
      const errorMsg = `Failed to get memory size: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async health(): Promise<MemoryHealth> {
    const totalSize = this.storage.size;
    const lastAccessTimes = Array.from(this.accessLog.values());
    const lastAccess =
      lastAccessTimes.length > 0
        ? new Date(Math.max(...lastAccessTimes.map((d) => d.getTime())))
        : new Date();

    // Calculate approximate memory usage
    let usedSize = 0;
    try {
      for (const [key, value] of this.storage.entries()) {
        usedSize += this.calculateSize(key) + this.calculateSize(value);
      }
    } catch (error) {
      this.warnings.push(
        `Failed to calculate memory usage: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    const freeSize = Math.max(0, 1000000 - usedSize); // Assume 1MB limit
    const status = this.determineHealthStatus(usedSize, totalSize);

    return {
      status,
      totalSize,
      usedSize,
      freeSize,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastAccess,
      metadata: {
        keysCount: this.storage.size,
        accessLogCount: this.accessLog.size,
      },
    };
  }

  protected abstract buildKeyPrefix(context: MemoryContext): string;

  protected buildKey(key: string, context: MemoryContext): string {
    return `${this.buildKeyPrefix(context)}:${key}`;
  }

  protected calculateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate (2 bytes per char)
    } catch {
      return 0;
    }
  }

  protected determineHealthStatus(
    usedSize: number,
    totalSize: number,
  ): "healthy" | "degraded" | "unhealthy" {
    if (this.errors.length > 0) {
      return "unhealthy";
    }

    const usageRatio = totalSize > 0 ? usedSize / 1000000 : 0; // Against 1MB limit

    if (usageRatio > 0.9) {
      return "unhealthy";
    } else if (usageRatio > 0.7 || this.warnings.length > 0) {
      return "degraded";
    }

    return "healthy";
  }
}
