import { BaseAgentMemory } from "./agent-memory";
import { MemoryContext } from "./memory-context";

export interface IScratchpadMemory<T = unknown> {
  put(key: string, value: T, context: MemoryContext): Promise<void>;
  get(key: string, context: MemoryContext): Promise<T | undefined>;
  remove(key: string, context: MemoryContext): Promise<boolean>;
  clear(context: MemoryContext): Promise<void>;
  entries(context: MemoryContext): Promise<Array<[string, T]>>;
}

export class ScratchpadMemory<T = unknown> extends BaseAgentMemory<T> implements IScratchpadMemory<T> {
  // Execution-scoped storage with automatic cleanup
  private readonly executionStorage: Map<string, Map<string, T>> = new Map();
  private readonly executionTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly defaultTTL: number = 300000; // 5 minutes

  public async put(key: string, value: T, context: MemoryContext): Promise<void> {
    try {
      const executionKey = this.getExecutionKey(context);
      
      if (!this.executionStorage.has(executionKey)) {
        this.executionStorage.set(executionKey, new Map());
        this.scheduleCleanup(executionKey);
      }
      
      const executionMap = this.executionStorage.get(executionKey)!;
      executionMap.set(key, value);
      
      this.accessLog.set(`${executionKey}:${key}`, new Date());
    } catch (error) {
      const errorMsg = `Failed to put scratchpad memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async get(key: string, context: MemoryContext): Promise<T | undefined> {
    try {
      const executionKey = this.getExecutionKey(context);
      const executionMap = this.executionStorage.get(executionKey);
      
      if (!executionMap) {
        return undefined;
      }
      
      const value = executionMap.get(key);
      
      if (value !== undefined) {
        this.accessLog.set(`${executionKey}:${key}`, new Date());
      }
      
      return value;
    } catch (error) {
      const errorMsg = `Failed to get scratchpad memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async remove(key: string, context: MemoryContext): Promise<boolean> {
    try {
      const executionKey = this.getExecutionKey(context);
      const executionMap = this.executionStorage.get(executionKey);
      
      if (!executionMap) {
        return false;
      }
      
      const existed = executionMap.has(key);
      executionMap.delete(key);
      this.accessLog.delete(`${executionKey}:${key}`);
      
      return existed;
    } catch (error) {
      const errorMsg = `Failed to remove scratchpad memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async clear(context: MemoryContext): Promise<void> {
    try {
      const executionKey = this.getExecutionKey(context);
      const executionMap = this.executionStorage.get(executionKey);
      
      if (executionMap) {
        // Clear access log entries for this execution
        for (const key of executionMap.keys()) {
          this.accessLog.delete(`${executionKey}:${key}`);
        }
        
        executionMap.clear();
      }
    } catch (error) {
      const errorMsg = `Failed to clear scratchpad memory: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async entries(context: MemoryContext): Promise<Array<[string, T]>> {
    try {
      const executionKey = this.getExecutionKey(context);
      const executionMap = this.executionStorage.get(executionKey);
      
      if (!executionMap) {
        return [];
      }
      
      return Array.from(executionMap.entries());
    } catch (error) {
      const errorMsg = `Failed to get scratchpad memory entries: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async size(context: MemoryContext): Promise<number> {
    try {
      const executionKey = this.getExecutionKey(context);
      const executionMap = this.executionStorage.get(executionKey);
      return executionMap ? executionMap.size : 0;
    } catch (error) {
      const errorMsg = `Failed to get scratchpad memory size: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public cleanupExecution(executionId: string): void {
    const executionKey = `exec:${executionId}`;
    const executionMap = this.executionStorage.get(executionKey);
    
    if (executionMap) {
      // Clear access log entries
      for (const key of executionMap.keys()) {
        this.accessLog.delete(`${executionKey}:${key}`);
      }
      
      // Remove execution storage
      this.executionStorage.delete(executionKey);
    }
    
    // Clear timer
    const timer = this.executionTimers.get(executionKey);
    if (timer) {
      clearTimeout(timer);
      this.executionTimers.delete(executionKey);
    }
  }

  protected buildKeyPrefix(context: MemoryContext): string {
    return `scratchpad:${context.executionId}`;
  }

  private getExecutionKey(context: MemoryContext): string {
    return `exec:${context.executionId}`;
  }

  private scheduleCleanup(executionKey: string): void {
    // Clear any existing timer
    const existingTimer = this.executionTimers.get(executionKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Schedule new cleanup
    const timer = setTimeout(() => {
      const executionId = executionKey.replace('exec:', '');
      this.cleanupExecution(executionId);
    }, this.defaultTTL);
    
    this.executionTimers.set(executionKey, timer);
  }
}