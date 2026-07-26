import { BaseAgentMemory } from "./agent-memory";
import { MemoryContext } from "./memory-context";

export interface IWorkspaceMemory<T = unknown> {
  put(key: string, value: T, context: MemoryContext): Promise<void>;
  get(key: string, context: MemoryContext): Promise<T | undefined>;
  remove(key: string, context: MemoryContext): Promise<boolean>;
  keys(context: MemoryContext): Promise<string[]>;
  clear(context: MemoryContext): Promise<void>;
}

export class WorkspaceMemory<T = unknown> extends BaseAgentMemory<T> implements IWorkspaceMemory<T> {
  // Workspace-scoped storage with namespace support
  private readonly workspaceStorage: Map<string, Map<string, T>> = new Map();
  private readonly maxKeysPerWorkspace: number = 10000;

  public async put(key: string, value: T, context: MemoryContext): Promise<void> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      
      if (!this.workspaceStorage.has(workspaceKey)) {
        this.workspaceStorage.set(workspaceKey, new Map());
      }
      
      const workspaceMap = this.workspaceStorage.get(workspaceKey)!;
      
      // Check size limits
      if (!workspaceMap.has(key) && workspaceMap.size >= this.maxKeysPerWorkspace) {
        throw new Error(`Workspace memory limit reached: ${this.maxKeysPerWorkspace} keys`);
      }
      
      workspaceMap.set(key, value);
      this.accessLog.set(`${workspaceKey}:${key}`, new Date());
    } catch (error) {
      const errorMsg = `Failed to put workspace memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async get(key: string, context: MemoryContext): Promise<T | undefined> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      
      if (!workspaceMap) {
        return undefined;
      }
      
      const value = workspaceMap.get(key);
      
      if (value !== undefined) {
        this.accessLog.set(`${workspaceKey}:${key}`, new Date());
      }
      
      return value;
    } catch (error) {
      const errorMsg = `Failed to get workspace memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async remove(key: string, context: MemoryContext): Promise<boolean> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      
      if (!workspaceMap) {
        return false;
      }
      
      const existed = workspaceMap.has(key);
      workspaceMap.delete(key);
      this.accessLog.delete(`${workspaceKey}:${key}`);
      
      return existed;
    } catch (error) {
      const errorMsg = `Failed to remove workspace memory '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async keys(context: MemoryContext): Promise<string[]> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      
      if (!workspaceMap) {
        return [];
      }
      
      return Array.from(workspaceMap.keys());
    } catch (error) {
      const errorMsg = `Failed to get workspace memory keys: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async clear(context: MemoryContext): Promise<void> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      
      if (workspaceMap) {
        // Clear access log entries for this workspace
        for (const key of workspaceMap.keys()) {
          this.accessLog.delete(`${workspaceKey}:${key}`);
        }
        
        workspaceMap.clear();
      }
    } catch (error) {
      const errorMsg = `Failed to clear workspace memory: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async size(context: MemoryContext): Promise<number> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      return workspaceMap ? workspaceMap.size : 0;
    } catch (error) {
      const errorMsg = `Failed to get workspace memory size: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async entries(context: MemoryContext): Promise<Array<[string, T]>> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      
      if (!workspaceMap) {
        return [];
      }
      
      return Array.from(workspaceMap.entries());
    } catch (error) {
      const errorMsg = `Failed to get workspace memory entries: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  public async has(key: string, context: MemoryContext): Promise<boolean> {
    try {
      const workspaceKey = this.getWorkspaceKey(context);
      const workspaceMap = this.workspaceStorage.get(workspaceKey);
      return workspaceMap ? workspaceMap.has(key) : false;
    } catch (error) {
      const errorMsg = `Failed to check workspace memory key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  protected buildKeyPrefix(context: MemoryContext): string {
    return `workspace:${context.workspaceId}`;
  }

  private getWorkspaceKey(context: MemoryContext): string {
    return `ws:${context.workspaceId}`;
  }
}