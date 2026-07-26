import { ExecutionResult, ExecutionStatus } from "../types";
import { ExecutionNotFoundException } from "../exceptions";

export interface IExecutionRegistry {
  register(executionResult: ExecutionResult): Promise<void>;
  update(executionId: string, executionResult: ExecutionResult): Promise<void>;
  get(executionId: string): Promise<ExecutionResult | undefined>;
  list(): Promise<ExecutionResult[]>;
  listByStatus(status: ExecutionStatus): Promise<ExecutionResult[]>;
  listByAgent(agentId: string): Promise<ExecutionResult[]>;
  remove(executionId: string): Promise<void>;
  cleanup(maxAge: number): Promise<number>;
  count(): Promise<number>;
  getMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    cancelled: number;
    timeout: number;
  }>;
}

export class ExecutionRegistry implements IExecutionRegistry {
  private readonly executions: Map<string, ExecutionResult> = new Map();
  private readonly activeExecutions: Set<string> = new Set();

  public async register(executionResult: ExecutionResult): Promise<void> {
    this.executions.set(executionResult.executionId, executionResult);
    
    if (executionResult.status === ExecutionStatus.RUNNING || executionResult.status === ExecutionStatus.PENDING) {
      this.activeExecutions.add(executionResult.executionId);
    }
  }

  public async update(executionId: string, executionResult: ExecutionResult): Promise<void> {
    if (!this.executions.has(executionId)) {
      throw new ExecutionNotFoundException(executionId);
    }

    this.executions.set(executionId, executionResult);

    // Update active tracking
    if (executionResult.status === ExecutionStatus.RUNNING || executionResult.status === ExecutionStatus.PENDING) {
      this.activeExecutions.add(executionId);
    } else {
      this.activeExecutions.delete(executionId);
    }
  }

  public async get(executionId: string): Promise<ExecutionResult | undefined> {
    return this.executions.get(executionId);
  }

  public async list(): Promise<ExecutionResult[]> {
    return Array.from(this.executions.values());
  }

  public async listByStatus(status: ExecutionStatus): Promise<ExecutionResult[]> {
    return Array.from(this.executions.values()).filter(
      execution => execution.status === status
    );
  }

  public async listByAgent(agentId: string): Promise<ExecutionResult[]> {
    return Array.from(this.executions.values()).filter(
      execution => execution.agentId === agentId
    );
  }

  public async remove(executionId: string): Promise<void> {
    this.executions.delete(executionId);
    this.activeExecutions.delete(executionId);
  }

  public async cleanup(maxAge: number): Promise<number> {
    const cutoffTime = Date.now() - maxAge;
    let removedCount = 0;

    for (const [executionId, execution] of this.executions.entries()) {
      // Only cleanup non-active executions that are older than maxAge
      if (!this.activeExecutions.has(executionId) && 
          execution.finishedAt.getTime() < cutoffTime) {
        this.executions.delete(executionId);
        removedCount++;
      }
    }

    return removedCount;
  }

  public async count(): Promise<number> {
    return this.executions.size;
  }

  public async getMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    cancelled: number;
    timeout: number;
  }> {
    const executions = Array.from(this.executions.values());
    
    return {
      total: executions.length,
      active: this.activeExecutions.size,
      completed: executions.filter(e => e.status === ExecutionStatus.COMPLETED).length,
      failed: executions.filter(e => e.status === ExecutionStatus.FAILED).length,
      cancelled: executions.filter(e => e.status === ExecutionStatus.CANCELLED).length,
      timeout: executions.filter(e => e.status === ExecutionStatus.TIMEOUT).length
    };
  }

  public isActive(executionId: string): boolean {
    return this.activeExecutions.has(executionId);
  }

  public listActiveExecutions(): string[] {
    return Array.from(this.activeExecutions);
  }
}