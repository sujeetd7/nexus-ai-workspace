import { randomUUID } from "crypto";
import {
  ExecutionRequest,
  BatchExecutionRequest,
  ExecutionResult,
  BatchExecutionResult,
  ExecutionStatus,
} from "../types";
import { IAgent, IAgentRegistry } from "../interfaces";
import { IAgentExecutor, AgentExecutor } from "../executor";
import { IExecutionRegistry, ExecutionRegistry } from "./execution-registry";
import {
  AgentNotFoundException,
  ExecutionNotFoundException,
  AgentExecutionException,
} from "../exceptions";

export interface IAgentRuntime {
  executeAgent(request: ExecutionRequest): Promise<ExecutionResult>;
  executeBatch(request: BatchExecutionRequest): Promise<BatchExecutionResult>;
  cancelExecution(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<ExecutionResult>;
  listExecutions(): Promise<ExecutionResult[]>;
  cleanup(maxAgeMs: number): Promise<number>;
}

export class AgentRuntime implements IAgentRuntime {
  private readonly executor: IAgentExecutor;
  private readonly executionRegistry: IExecutionRegistry;

  constructor(private readonly agentRegistry: IAgentRegistry) {
    this.executor = new AgentExecutor(agentRegistry);
    this.executionRegistry = new ExecutionRegistry();
  }

  public async executeAgent(
    request: ExecutionRequest,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = randomUUID();

    // Create initial execution result
    const initialResult: ExecutionResult = {
      executionId,
      agentId: request.agentId,
      success: false,
      output: undefined,
      startedAt: new Date(),
      finishedAt: new Date(),
      latency: 0,
      usage: undefined,
      errors: [],
      metadata: {
        ...request.context.metadata,
        requestId: request.context.requestId,
      },
      status: ExecutionStatus.PENDING,
    };

    // Register the execution
    await this.executionRegistry.register(initialResult);

    try {
      // Get agent from registry
      const agent = await this.agentRegistry.find(request.agentId);
      if (!agent) {
        throw new AgentNotFoundException(request.agentId);
      }

      // Update status to running
      const runningResult = {
        ...initialResult,
        status: ExecutionStatus.RUNNING,
        startedAt: new Date(),
      };
      await this.executionRegistry.update(executionId, runningResult);

      // Execute the agent
      const result = await this.executor.execute(agent, request.input, {
        ...request.context,
        timeout: request.timeout,
      });

      // Update the execution result with the actual execution ID
      const finalResult = {
        ...result,
        executionId,
      };

      // Update registry with final result
      await this.executionRegistry.update(executionId, finalResult);

      return finalResult;
    } catch (error) {
      const finishedAt = new Date();
      const latency = Date.now() - startTime;

      const errorResult: ExecutionResult = {
        ...initialResult,
        executionId,
        success: false,
        finishedAt,
        latency,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        metadata: {
          ...initialResult.metadata,
          error: error instanceof Error ? error.name : "UnknownError",
        },
        status: ExecutionStatus.FAILED,
      };

      await this.executionRegistry.update(executionId, errorResult);
      throw error;
    }
  }

  public async executeBatch(
    request: BatchExecutionRequest,
  ): Promise<BatchExecutionResult> {
    const batchId = randomUUID();
    const startTime = Date.now();
    const maxConcurrency = request.maxConcurrency || 5;
    const failFast = request.failFast || false;

    const results: ExecutionResult[] = [];
    const errors: string[] = [];

    // Create semaphore for concurrency control
    const semaphore = this.createSemaphore(maxConcurrency);

    const executeRequest = async (
      execRequest: ExecutionRequest,
    ): Promise<void> => {
      await semaphore.acquire();

      try {
        const result = await this.executeAgent(execRequest);
        results.push(result);

        if (failFast && !result.success) {
          throw new AgentExecutionException(
            result.agentId,
            result.executionId,
            result.errors.join(", "),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(errorMessage);

        if (failFast) {
          throw error;
        }
      } finally {
        semaphore.release();
      }
    };

    try {
      // Execute all requests
      const promises = request.requests.map(executeRequest);
      await Promise.allSettled(promises);

      const totalLatency = Date.now() - startTime;
      const success = errors.length === 0 && results.every((r) => r.success);

      const batchResult: BatchExecutionResult = {
        batchId,
        results,
        success,
        totalLatency,
        metadata: {
          requestCount: request.requests.length,
          successCount: results.filter((r) => r.success).length,
          failureCount: results.filter((r) => !r.success).length,
          errorCount: errors.length,
          maxConcurrency,
          failFast,
        },
      };

      return batchResult;
    } catch (error) {
      throw new AgentExecutionException(
        "batch",
        batchId,
        `Batch execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  public async cancelExecution(executionId: string): Promise<void> {
    const execution = await this.executionRegistry.get(executionId);
    if (!execution) {
      throw new ExecutionNotFoundException(executionId);
    }

    if (
      execution.status !== ExecutionStatus.RUNNING &&
      execution.status !== ExecutionStatus.PENDING
    ) {
      return; // Already completed
    }

    await this.executor.cancel(executionId);

    // Update execution status
    const cancelledResult: ExecutionResult = {
      ...execution,
      success: false,
      finishedAt: new Date(),
      latency: Date.now() - execution.startedAt.getTime(),
      errors: ["Execution was cancelled"],
      status: ExecutionStatus.CANCELLED,
    };

    await this.executionRegistry.update(executionId, cancelledResult);
  }

  public async getExecution(executionId: string): Promise<ExecutionResult> {
    const execution = await this.executionRegistry.get(executionId);
    if (!execution) {
      throw new ExecutionNotFoundException(executionId);
    }
    return execution;
  }

  public async listExecutions(): Promise<ExecutionResult[]> {
    return await this.executionRegistry.list();
  }

  public async cleanup(maxAgeMs: number): Promise<number> {
    return await this.executionRegistry.cleanup(maxAgeMs);
  }

  public async getMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
    cancelled: number;
    timeout: number;
  }> {
    return await this.executionRegistry.getMetrics();
  }

  public async listActiveExecutions(): Promise<ExecutionResult[]> {
    return await this.executionRegistry.listByStatus(ExecutionStatus.RUNNING);
  }

  public async listExecutionsByAgent(
    agentId: string,
  ): Promise<ExecutionResult[]> {
    return await this.executionRegistry.listByAgent(agentId);
  }

  private createSemaphore(limit: number) {
    let count = 0;
    const waitQueue: Array<() => void> = [];

    return {
      async acquire(): Promise<void> {
        if (count < limit) {
          count++;
          return;
        }

        return new Promise<void>((resolve) => {
          waitQueue.push(resolve);
        });
      },

      release(): void {
        const next = waitQueue.shift();
        if (next) {
          next();
        } else {
          count--;
        }
      },
    };
  }
}
