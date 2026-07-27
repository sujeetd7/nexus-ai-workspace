import { BaseAgentMemory } from "./agent-memory";
import { MemoryContext } from "./memory-context";

export interface SharedMemoryEntry<T = unknown> {
  value: T;
  version: number;
  lockedBy?: string;
  lockedAt?: Date;
  lastModified: Date;
  metadata: Record<string, unknown>;
}

export interface LockResult {
  success: boolean;
  lockId?: string;
  currentVersion: number;
  message: string;
}

export interface ISharedMemory<T = unknown> {
  read(
    key: string,
    context: MemoryContext,
  ): Promise<SharedMemoryEntry<T> | undefined>;
  write(
    key: string,
    value: T,
    version: number,
    context: MemoryContext,
  ): Promise<boolean>;
  lock(key: string, context: MemoryContext): Promise<LockResult>;
  unlock(key: string, lockId: string, context: MemoryContext): Promise<boolean>;
}

export class SharedMemory<T = unknown>
  extends BaseAgentMemory<SharedMemoryEntry<T>>
  implements ISharedMemory<T>
{
  private readonly locks: Map<
    string,
    { lockId: string; agentId: string; timestamp: Date }
  > = new Map();
  private readonly lockTimeout: number = 30000; // 30 seconds
  private readonly lockCleanupInterval: NodeJS.Timeout;

  constructor() {
    super();

    // Start lock cleanup timer
    this.lockCleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 10000); // Check every 10 seconds
  }

  public async read(
    key: string,
    context: MemoryContext,
  ): Promise<SharedMemoryEntry<T> | undefined> {
    try {
      const entry = await this.load(key, context);
      return entry;
    } catch (error) {
      const errorMsg = `Failed to read shared memory '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async write(
    key: string,
    value: T,
    expectedVersion: number,
    context: MemoryContext,
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, context);
      const currentEntry = await this.load(key, context);

      // Check version for optimistic locking
      if (currentEntry && currentEntry.version !== expectedVersion) {
        return false; // Version mismatch - write failed
      }

      // Check if locked by another agent
      const lockInfo = this.locks.get(fullKey);
      if (lockInfo && lockInfo.agentId !== context.agentId) {
        // Check if lock is still valid
        if (Date.now() - lockInfo.timestamp.getTime() < this.lockTimeout) {
          return false; // Still locked by another agent
        } else {
          // Lock expired, remove it
          this.locks.delete(fullKey);
        }
      }

      const newVersion = currentEntry ? currentEntry.version + 1 : 1;
      const newEntry: SharedMemoryEntry<T> = {
        value,
        version: newVersion,
        lastModified: new Date(),
        metadata: {
          ...context.metadata,
          modifiedBy: context.agentId,
          previousVersion: currentEntry?.version || 0,
        },
      };

      await this.save(key, newEntry, context);
      return true;
    } catch (error) {
      const errorMsg = `Failed to write shared memory '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async lock(key: string, context: MemoryContext): Promise<LockResult> {
    try {
      const fullKey = this.buildKey(key, context);
      const currentEntry = await this.load(key, context);
      const currentVersion = currentEntry ? currentEntry.version : 0;

      // Check if already locked
      const existingLock = this.locks.get(fullKey);
      if (existingLock) {
        // Check if lock is still valid
        if (Date.now() - existingLock.timestamp.getTime() < this.lockTimeout) {
          if (existingLock.agentId === context.agentId) {
            // Already locked by this agent
            return {
              success: true,
              lockId: existingLock.lockId,
              currentVersion,
              message: "Already locked by this agent",
            };
          } else {
            // Locked by another agent
            return {
              success: false,
              currentVersion,
              message: `Locked by agent ${existingLock.agentId}`,
            };
          }
        } else {
          // Lock expired, remove it
          this.locks.delete(fullKey);
        }
      }

      // Create new lock
      const lockId = `${context.agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.locks.set(fullKey, {
        lockId,
        agentId: context.agentId,
        timestamp: new Date(),
      });

      // Update entry to mark as locked
      if (currentEntry) {
        const updatedEntry: SharedMemoryEntry<T> = {
          ...currentEntry,
          lockedBy: context.agentId,
          lockedAt: new Date(),
        };
        await this.save(key, updatedEntry, context);
      }

      return {
        success: true,
        lockId,
        currentVersion,
        message: "Lock acquired successfully",
      };
    } catch (error) {
      const errorMsg = `Failed to lock shared memory '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async unlock(
    key: string,
    lockId: string,
    context: MemoryContext,
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, context);
      const lockInfo = this.locks.get(fullKey);

      if (!lockInfo) {
        return false; // No lock found
      }

      if (lockInfo.lockId !== lockId || lockInfo.agentId !== context.agentId) {
        return false; // Invalid lock ID or different agent
      }

      // Remove lock
      this.locks.delete(fullKey);

      // Update entry to remove lock info
      const currentEntry = await this.load(key, context);
      if (currentEntry) {
        const updatedEntry: SharedMemoryEntry<T> = {
          ...currentEntry,
          lockedBy: undefined,
          lockedAt: undefined,
        };
        await this.save(key, updatedEntry, context);
      }

      return true;
    } catch (error) {
      const errorMsg = `Failed to unlock shared memory '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async isLocked(key: string, context: MemoryContext): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, context);
      const lockInfo = this.locks.get(fullKey);

      if (!lockInfo) {
        return false;
      }

      // Check if lock is still valid
      if (Date.now() - lockInfo.timestamp.getTime() >= this.lockTimeout) {
        this.locks.delete(fullKey);
        return false;
      }

      return true;
    } catch (error) {
      const errorMsg = `Failed to check lock status for shared memory '${key}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public getLockInfo(
    key: string,
    context: MemoryContext,
  ): { lockId: string; agentId: string; timestamp: Date } | undefined {
    const fullKey = this.buildKey(key, context);
    return this.locks.get(fullKey);
  }

  public cleanup(): void {
    clearInterval(this.lockCleanupInterval);
  }

  protected buildKeyPrefix(context: MemoryContext): string {
    return `shared:${context.workspaceId}`;
  }

  private cleanupExpiredLocks(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, lockInfo] of this.locks.entries()) {
      if (now - lockInfo.timestamp.getTime() >= this.lockTimeout) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.locks.delete(key);

      // Also clear lock info from the entry if it exists
      try {
        const keyParts = key.split(":");
        if (keyParts.length >= 2) {
          const memoryKey = keyParts.slice(-1)[0];
          const entry = this.storage.get(key);
          if (entry) {
            const updatedEntry: SharedMemoryEntry<T> = {
              ...entry,
              lockedBy: undefined,
              lockedAt: undefined,
            };
            this.storage.set(key, updatedEntry);
          }
        }
      } catch (error) {
        this.warnings.push(
          `Failed to clear expired lock info: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    if (expiredKeys.length > 0) {
      this.warnings.push(`Cleaned up ${expiredKeys.length} expired locks`);
    }
  }
}
