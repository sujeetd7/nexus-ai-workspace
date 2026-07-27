import { EventEmitter } from "events";
import { MCPManager } from "./mcp-manager";
import { MCPSecurityManager } from "../security";
import { ExecutionMetricsCollector } from "../runtime/execution-metrics";
import {
  MCPExecutionContext,
  MCPExecutionOptions,
  MCPExecutionRequest,
  MCPExecutionResult,
  MCPBatchExecutionRequest,
  MCPBatchExecutionResult,
  generateExecutionId,
  isRetryableError,
} from "../runtime/execution-context";

export interface MCPExecutionManagerConfig {
  defaultTimeout?: number;
  defaultRetries?: number;
  defaultRetryDelay?: number;
  maxConcurrentExecutions?: number;
  enableMetrics?: boolean;
  enableSecurity?: boolean;
}

export class MCPExecutionManager extends EventEmitter {
  private mcpManager: MCPManager;
  private securityManager?: MCPSecurityManager;
  private metricsCollector: ExecutionMetricsCollector;
  private config: Required<MCPExecutionManagerConfig>;
  private activeExecutions = new Map<string, AbortController>();
  private executionQueue: Array<() => Promise<void>> = [];
  private processingQueue = false;

  constructor(
    mcpManager: MCPManager,
    securityManager?: MCPSecurityManager,
    config: MCPExecutionManagerConfig = {},
  ) {
    super();
    this.mcpManager = mcpManager;
    this.securityManager = securityManager;
    this.metricsCollector = new ExecutionMetricsCollector();
    this.config = {
      defaultTimeout: config.defaultTimeout ?? 30000,
      defaultRetries: config.defaultRetries ?? 3,
      defaultRetryDelay: config.defaultRetryDelay ?? 1000,
      maxConcurrentExecutions: config.maxConcurrentExecutions ?? 10,
      enableMetrics: config.enableMetrics ?? true,
      enableSecurity: config.enableSecurity ?? true,
    };
  }

  async execute(request: MCPExecutionRequest): Promise<MCPExecutionResult> {
    const executionId = generateExecutionId(request.context, request.toolName);
    const startTime = new Date();
    const options = {
      timeout: this.config.defaultTimeout,
      retries: this.config.defaultRetries,
      retryDelay: this.config.defaultRetryDelay,
      ...request.options,
    };

    // Check concurrent execution limit
    if (this.activeExecutions.size >= this.config.maxConcurrentExecutions) {
      return {
        success: false,
        error: {
          code: "EXECUTION_LIMIT_EXCEEDED",
          message: `Maximum concurrent executions (${this.config.maxConcurrentExecutions}) exceeded`,
          retryable: true,
        },
        metadata: {
          executionId,
          serverId: request.serverId,
          toolName: request.toolName,
          requestId: request.context.requestId,
          startTime,
          endTime: new Date(),
          duration: 0,
          retryAttempt: 0,
          cached: false,
        },
      };
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);

    try {
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Execution timeout after ${options.timeout}ms`));
        }, options.timeout);

        abortController.signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Execution cancelled"));
        });
      });

      // Execute with retries
      let lastError: any = null;
      for (let attempt = 0; attempt <= options.retries!; attempt++) {
        try {
          const executionPromise = this.executeInternal(
            request,
            executionId,
            attempt,
          );
          const result = await Promise.race([executionPromise, timeoutPromise]);

          // Record success metrics
          if (this.config.enableMetrics) {
            const duration = Date.now() - startTime.getTime();
            this.metricsCollector.recordExecution(
              request.serverId,
              request.toolName,
              duration,
              result.success,
              attempt,
              false,
            );
          }

          return result;
        } catch (error) {
          lastError = error;

          // Don't retry if cancelled or non-retryable error
          if (abortController.signal.aborted || !isRetryableError(error)) {
            break;
          }

          // Wait before retry (except on last attempt)
          if (attempt < options.retries!) {
            await this.delay(options.retryDelay! * Math.pow(2, attempt));
          }
        }
      }

      // All retries failed
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const timedOut = lastError?.message?.includes("timeout");

      // Record failure metrics
      if (this.config.enableMetrics) {
        this.metricsCollector.recordExecution(
          request.serverId,
          request.toolName,
          duration,
          false,
          options.retries!,
          timedOut,
        );
      }

      const result: MCPExecutionResult = {
        success: false,
        error: {
          code: timedOut ? "EXECUTION_TIMEOUT" : "EXECUTION_FAILED",
          message: lastError?.message || "Execution failed after retries",
          details: lastError,
          retryable: isRetryableError(lastError),
        },
        metadata: {
          executionId,
          serverId: request.serverId,
          toolName: request.toolName,
          requestId: request.context.requestId,
          startTime,
          endTime,
          duration,
          retryAttempt: options.retries!,
          cached: false,
        },
      };

      this.emit("execution:failed", { request, result, error: lastError });
      return result;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  async executeBatch(
    batchRequest: MCPBatchExecutionRequest,
  ): Promise<MCPBatchExecutionResult> {
    const startTime = new Date();
    const options = {
      parallel: true,
      continueOnError: true,
      maxConcurrency: this.config.maxConcurrentExecutions,
      ...batchRequest.options,
    };

    const results: MCPExecutionResult[] = [];

    if (options.parallel) {
      // Execute in parallel with concurrency control
      const semaphore = this.createSemaphore(options.maxConcurrency);

      const promises = batchRequest.requests.map(async (req) => {
        await semaphore.acquire();
        try {
          const executionRequest: MCPExecutionRequest = {
            context: batchRequest.context,
            serverId: req.serverId,
            toolName: req.toolName,
            parameters: req.parameters,
            options: req.options,
          };
          return await this.execute(executionRequest);
        } finally {
          semaphore.release();
        }
      });

      const batchResults = await Promise.allSettled(promises);

      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          // Create error result for rejected promises
          results.push({
            success: false,
            error: {
              code: "BATCH_EXECUTION_ERROR",
              message: result.reason?.message || "Batch execution failed",
              retryable: false,
            },
            metadata: {
              executionId: `batch_error_${Date.now()}`,
              serverId: "unknown",
              toolName: "unknown",
              requestId: batchRequest.context.requestId,
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              retryAttempt: 0,
              cached: false,
            },
          });
        }
      }
    } else {
      // Execute sequentially
      for (const req of batchRequest.requests) {
        try {
          const executionRequest: MCPExecutionRequest = {
            context: batchRequest.context,
            serverId: req.serverId,
            toolName: req.toolName,
            parameters: req.parameters,
            options: req.options,
          };

          const result = await this.execute(executionRequest);
          results.push(result);

          // Stop on error if continueOnError is false
          if (!result.success && !options.continueOnError) {
            break;
          }
        } catch (error) {
          const errorResult: MCPExecutionResult = {
            success: false,
            error: {
              code: "BATCH_EXECUTION_ERROR",
              message: error instanceof Error ? error.message : "Unknown error",
              retryable: false,
            },
            metadata: {
              executionId: `batch_error_${Date.now()}`,
              serverId: req.serverId,
              toolName: req.toolName,
              requestId: batchRequest.context.requestId,
              startTime: new Date(),
              endTime: new Date(),
              duration: 0,
              retryAttempt: 0,
              cached: false,
            },
          };

          results.push(errorResult);

          if (!options.continueOnError) {
            break;
          }
        }
      }
    }

    const endTime = new Date();
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    const batchResult: MCPBatchExecutionResult = {
      success: failed === 0,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        duration: endTime.getTime() - startTime.getTime(),
      },
    };

    this.emit("execution:batch_completed", { batchRequest, batchResult });
    return batchResult;
  }

  async cancel(executionId: string): Promise<boolean> {
    const abortController = this.activeExecutions.get(executionId);
    if (abortController) {
      abortController.abort();
      return true;
    }
    return false;
  }

  async cancelAll(): Promise<number> {
    let cancelled = 0;
    for (const [
      executionId,
      abortController,
    ] of this.activeExecutions.entries()) {
      abortController.abort();
      cancelled++;
    }
    this.activeExecutions.clear();
    return cancelled;
  }

  getMetrics() {
    return this.metricsCollector;
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  getExecutionCount(): number {
    return this.activeExecutions.size;
  }

  private async executeInternal(
    request: MCPExecutionRequest,
    executionId: string,
    retryAttempt: number,
  ): Promise<MCPExecutionResult> {
    const startTime = new Date();

    try {
      // Security check
      if (this.config.enableSecurity && this.securityManager) {
        const securityContext = {
          userId: request.context.userId,
          workspaceId: request.context.workspaceId,
          sessionId: request.context.sessionId,
          serverId: request.serverId,
          roles: [],
          permissions: [],
        };

        await this.securityManager.authorizeTool({
          context: securityContext,
          toolName: request.toolName,
          parameters: request.parameters,
        });
      }

      // Execute via MCP Manager
      const mcpResult = await this.mcpManager.executeTool(
        request.serverId,
        request.toolName,
        request.parameters,
      );

      const endTime = new Date();
      const result: MCPExecutionResult = {
        success: mcpResult.success,
        data: mcpResult.data,
        error: mcpResult.error
          ? {
              code: mcpResult.error.code,
              message: mcpResult.error.message,
              details: mcpResult.error.details,
              retryable: isRetryableError(mcpResult.error),
            }
          : undefined,
        metadata: {
          executionId,
          serverId: request.serverId,
          toolName: request.toolName,
          requestId: request.context.requestId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          retryAttempt,
          cached: false,
        },
      };

      this.emit("execution:completed", { request, result });
      return result;
    } catch (error) {
      const endTime = new Date();
      const result: MCPExecutionResult = {
        success: false,
        error: {
          code: "EXECUTION_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
          retryable: isRetryableError(error),
        },
        metadata: {
          executionId,
          serverId: request.serverId,
          toolName: request.toolName,
          requestId: request.context.requestId,
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          retryAttempt,
          cached: false,
        },
      };

      throw error; // Re-throw for retry logic
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
