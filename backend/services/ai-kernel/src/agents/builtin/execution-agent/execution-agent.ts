import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext
} from "../../interfaces";
import { AgentType, AgentStatus, AgentPriority, AgentHealth, ExecutionResult, ExecutionStatus } from "../../types";
import {
  ExecutionOperation,
  ExecutionOperationRequest,
  ExecuteAgentRequest,
  ExecuteBatchRequest,
  CancelExecutionRequest,
  ExecutionStatusRequest,
  ExecutionOperationResult,
  ExecuteAgentResult,
  ExecuteBatchResult,
  CancelExecutionResult,
  ExecutionStatusResult,
  ExecutionAgentHealth,
  ExecutionAgentMetrics
} from "./execution-agent.types";
import {
  ExecutionAgentException,
  InvalidExecutionOperationException,
  ExecutionAgentRuntimeException,
  BatchExecutionAgentException,
  ExecutionCancellationException,
  ExecutionStatusException,
  AgentRuntimeUnavailableException,
  InvalidExecutionContextException
} from "./execution-agent.exceptions";
import { IAgentRuntime } from "../../runtime/agent-runtime";

export interface ExecutionAgentComponents {
  agentRuntime: IAgentRuntime;
}

export class ExecutionAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];
  
  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();
  
  // Execution components
  private readonly components: ExecutionAgentComponents;
  
  // Metrics
  private readonly operationCounts: Record<ExecutionOperation, number> = {} as Record<ExecutionOperation, number>;
  private readonly successCounts: Record<ExecutionOperation, number> = {} as Record<ExecutionOperation, number>;
  private readonly errorCounts: Record<ExecutionOperation, number> = {} as Record<ExecutionOperation, number>;
  private readonly latencies: Record<ExecutionOperation, number[]> = {} as Record<ExecutionOperation, number[]>;
  
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;
  
  // Execution tracking
  private totalExecutions = 0;
  private singleExecutions = 0;
  private batchExecutions = 0;
  private totalCancellations = 0;
  private successfulCancellations = 0;
  private totalStatusQueries = 0;
  private totalCleanups = 0;
  private batchStats = {
    totalRequests: 0,
    maxConcurrency: 0,
    failFastUsage: 0
  };

  constructor(components: ExecutionAgentComponents) {
    this.metadata = {
      id: "execution-agent",
      name: "Execution Agent",
      description: "Built-in agent for managing agent execution operations using the existing AgentRuntime infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["execution", "builtin", "runtime"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.capabilities = [
      {
        id: "agent-execution",
        name: "Agent Execution",
        description: "Execute individual agents with context and timeout management",
        inputSchema: { operation: "string", executionRequest: "object" },
        outputSchema: { success: "boolean", result: "object" },
        parameters: { timeout: 300000 },
        dependencies: []
      },
      {
        id: "batch-execution",
        name: "Batch Execution", 
        description: "Execute multiple agents in batch with concurrency control and fail-fast options",
        inputSchema: { operation: "string", batchRequest: "object" },
        outputSchema: { success: "boolean", result: "object" },
        parameters: { maxConcurrency: 10, failFast: false },
        dependencies: []
      },
      {
        id: "execution-control",
        name: "Execution Control",
        description: "Control and monitor agent executions with cancel and status operations",
        inputSchema: { operation: "string", executionId: "string" },
        outputSchema: { success: "boolean", status: "string" },
        parameters: {},
        dependencies: []
      }
    ];

    this.components = components;

    // Initialize metrics
    this.initializeMetrics();

    this.agentHealth = {
      status: "healthy",
      uptime: 0,
      lastHeartbeat: new Date(),
      memoryUsage: 0,
      cpuUsage: 0,
      errors: [],
      warnings: [],
      metrics: {}
    };
  }

  public get status(): AgentStatus {
    return this.agentStatus;
  }

  public get health(): AgentHealth {
    return this.agentHealth;
  }

  public async initialize(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.INITIALIZING;
      
      // Validate components
      if (!this.components.agentRuntime) {
        throw new AgentRuntimeUnavailableException();
      }
      
      this.agentStatus = AgentStatus.IDLE;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize execution agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new ExecutionAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;
      
      // Cleanup resources if needed
      // Agent runtime doesn't require special cleanup
      
      this.agentStatus = AgentStatus.STOPPED;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown execution agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new ExecutionAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      
      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentRuntime) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      this.agentHealth = {
        status,
        uptime,
        lastHeartbeat: new Date(),
        memoryUsage: 0, // Placeholder
        cpuUsage: 0, // Placeholder
        errors: [...this.errors],
        warnings: [...this.warnings],
        metrics: {
          totalExecutions: this.totalExecutions,
          totalOperations: Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0),
          successRate: this.calculateSuccessRate()
        }
      };
      
      return this.agentHealth;
      
    } catch (error) {
      const errorMsg = `Failed to get execution agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        status: "unhealthy",
        uptime: Date.now() - this.startTime.getTime(),
        lastHeartbeat: new Date(),
        memoryUsage: 0,
        cpuUsage: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        metrics: { error: 1 }
      };
    }
  }

  public async updateStatus(status: AgentStatus): Promise<void> {
    this.agentStatus = status;
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.some(cap => cap.id === capabilityId);
  }

  public getCapability(capabilityId: string): IAgentCapability | undefined {
    return this.capabilities.find(cap => cap.id === capabilityId);
  }

  public listCapabilities(): IAgentCapability[] {
    return [...this.capabilities];
  }

  // Main execution method - determines which operation to execute based on input
  public async execute(input: unknown, context: IAgentExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.lastActivity = new Date();
    
    try {
      // Validate input
      const request = this.validateAndParseRequest(input);
      
      // Record operation attempt
      this.recordOperationAttempt(request.operation);
      
      // Execute operation
      let result: ExecutionOperationResult;
      
      switch (request.operation) {
        case ExecutionOperation.EXECUTE:
          result = await this.executeAgent(request as ExecuteAgentRequest, context);
          break;
        case ExecutionOperation.EXECUTE_BATCH:
          result = await this.executeBatch(request as ExecuteBatchRequest, context);
          break;
        case ExecutionOperation.CANCEL:
          result = await this.cancelExecution(request as CancelExecutionRequest, context);
          break;
        case ExecutionOperation.STATUS:
          result = await this.getExecutionStatus(request as ExecutionStatusRequest, context);
          break;
        default:
          throw new InvalidExecutionOperationException(request.operation as string, "Unsupported operation");
      }
      
      // Record success
      const duration = Date.now() - startTime;
      this.recordOperationSuccess(request.operation, duration);
      
      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: result.success,
        output: result,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: result.error ? [result.error] : [],
        status: result.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        metadata: {
          operation: request.operation,
          ...result.metadata
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown execution error';
      
      // Record error
      if (input && typeof input === 'object' && 'operation' in input) {
        this.recordOperationError(input.operation as ExecutionOperation, duration);
      }
      
      this.errors.push(errorMsg);
      
      return {
        executionId: randomUUID(),
        agentId: this.metadata.id,
        success: false,
        output: undefined,
        startedAt: new Date(startTime),
        finishedAt: new Date(),
        latency: duration,
        usage: undefined,
        errors: [errorMsg],
        status: ExecutionStatus.FAILED,
        metadata: { error: errorMsg }
      };
    }
  }

  // Individual execution operations
  public async executeAgent(request: ExecuteAgentRequest, context: IAgentExecutionContext): Promise<ExecuteAgentResult> {
    const startedAt = new Date();
    
    try {
      // Validate execution request
      this.validateExecutionRequest(request.executionRequest);
      
      // Execute using existing runtime
      const result = await this.components.agentRuntime.executeAgent(request.executionRequest);
      
      this.totalExecutions++;
      this.singleExecutions++;
      
      return {
        success: true,
        operation: ExecutionOperation.EXECUTE,
        executionId: result.executionId,
        agentId: result.agentId,
        result,
        startedAt,
        metadata: {
          agentId: result.agentId,
          executionId: result.executionId,
          success: result.success,
          latency: result.latency,
          timestamp: startedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown agent execution error";
      throw new ExecutionAgentRuntimeException(request.executionRequest.agentId, errorMsg);
    }
  }

  public async executeBatch(request: ExecuteBatchRequest, context: IAgentExecutionContext): Promise<ExecuteBatchResult> {
    const startedAt = new Date();
    
    try {
      // Validate batch request
      this.validateBatchRequest(request.batchRequest);
      
      // Execute using existing runtime
      const result = await this.components.agentRuntime.executeBatch(request.batchRequest);
      
      this.totalExecutions++;
      this.batchExecutions++;
      
      // Update batch stats
      this.batchStats.totalRequests += request.batchRequest.requests.length;
      if (request.batchRequest.maxConcurrency && request.batchRequest.maxConcurrency > this.batchStats.maxConcurrency) {
        this.batchStats.maxConcurrency = request.batchRequest.maxConcurrency;
      }
      if (request.batchRequest.failFast) {
        this.batchStats.failFastUsage++;
      }
      
      return {
        success: true,
        operation: ExecutionOperation.EXECUTE_BATCH,
        batchId: result.batchId,
        totalRequests: request.batchRequest.requests.length,
        result,
        startedAt,
        metadata: {
          batchId: result.batchId,
          totalRequests: request.batchRequest.requests.length,
          success: result.success,
          totalLatency: result.totalLatency,
          maxConcurrency: request.batchRequest.maxConcurrency,
          failFast: request.batchRequest.failFast,
          timestamp: startedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown batch execution error";
      throw new BatchExecutionAgentException(request.batchRequest.requests.length, errorMsg);
    }
  }

  public async cancelExecution(request: CancelExecutionRequest, context: IAgentExecutionContext): Promise<CancelExecutionResult> {
    const cancelledAt = new Date();
    
    try {
      // Cancel using existing runtime
      await this.components.agentRuntime.cancelExecution(request.executionId);
      
      this.totalCancellations++;
      this.successfulCancellations++;
      
      return {
        success: true,
        operation: ExecutionOperation.CANCEL,
        executionId: request.executionId,
        cancelled: true,
        cancelledAt,
        metadata: {
          executionId: request.executionId,
          timestamp: cancelledAt
        }
      };
      
    } catch (error) {
      this.totalCancellations++;
      const errorMsg = error instanceof Error ? error.message : "Unknown execution cancellation error";
      throw new ExecutionCancellationException(request.executionId, errorMsg);
    }
  }

  public async getExecutionStatus(request: ExecutionStatusRequest, context: IAgentExecutionContext): Promise<ExecutionStatusResult> {
    const retrievedAt = new Date();
    
    try {
      // Get status using existing runtime
      const result = await this.components.agentRuntime.getExecution(request.executionId);
      
      this.totalStatusQueries++;
      
      return {
        success: true,
        operation: ExecutionOperation.STATUS,
        executionId: request.executionId,
        result,
        retrievedAt,
        metadata: {
          executionId: request.executionId,
          found: !!result,
          status: result?.status,
          timestamp: retrievedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown execution status error";
      throw new ExecutionStatusException(request.executionId, errorMsg);
    }
  }

  public async getExecutionAgentHealth(): Promise<ExecutionAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentRuntime) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      return {
        runtimeAvailable: !!this.components.agentRuntime,
        executorAvailable: true, // Assumed since runtime manages executor
        registryAvailable: true, // Assumed since runtime manages registry
        status,
        totalExecutions: this.totalExecutions,
        runningExecutions: 0, // Would need to track this from runtime
        completedExecutions: this.successCounts[ExecutionOperation.EXECUTE] || 0,
        failedExecutions: this.errorCounts[ExecutionOperation.EXECUTE] || 0,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          singleExecutions: this.singleExecutions,
          batchExecutions: this.batchExecutions,
          totalCancellations: this.totalCancellations,
          successfulCancellations: this.successfulCancellations,
          totalStatusQueries: this.totalStatusQueries,
          batchStats: { ...this.batchStats }
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to get execution agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        runtimeAvailable: false,
        executorAvailable: false,
        registryAvailable: false,
        status: "unhealthy",
        totalExecutions: 0,
        runningExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg }
      };
    }
  }

  public getMetrics(): ExecutionAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    
    // Calculate average latencies
    const averageLatencies: Record<ExecutionOperation, number> = {} as Record<ExecutionOperation, number>;
    Object.keys(this.latencies).forEach(op => {
      const operation = op as ExecutionOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });
    
    const successfulExecutions = this.successCounts[ExecutionOperation.EXECUTE] || 0;
    const failedExecutions = this.errorCounts[ExecutionOperation.EXECUTE] || 0;
    
    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      executionStats: {
        totalExecutions: this.totalExecutions,
        singleExecutions: this.singleExecutions,
        batchExecutions: this.batchExecutions,
        averageExecutionTime: averageLatencies[ExecutionOperation.EXECUTE] || 0,
        successfulExecutions,
        failedExecutions,
        cancelledExecutions: this.successfulCancellations,
        timeoutExecutions: 0 // Would need to track this from runtime
      },
      operationStats: {
        totalCancellations: this.totalCancellations,
        successfulCancellations: this.successfulCancellations,
        totalStatusQueries: this.totalStatusQueries,
        totalCleanups: this.totalCleanups,
        batchConcurrency: {
          averageRequests: this.batchExecutions > 0 ? this.batchStats.totalRequests / this.batchExecutions : 0,
          maxConcurrency: this.batchStats.maxConcurrency,
          failFastUsage: this.batchStats.failFastUsage
        }
      }
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): ExecutionOperationRequest {
    if (!input || typeof input !== 'object') {
      throw new InvalidExecutionOperationException("unknown", "Input must be an object");
    }
    
    const request = input as Record<string, unknown>;
    
    if (!request.operation || typeof request.operation !== 'string') {
      throw new InvalidExecutionOperationException("unknown", "Operation is required and must be a string");
    }
    
    if (!Object.values(ExecutionOperation).includes(request.operation as ExecutionOperation)) {
      throw new InvalidExecutionOperationException(request.operation as string, "Unsupported operation");
    }
    
    // Validate operation-specific requirements
    const operation = request.operation as ExecutionOperation;
    
    if (operation === ExecutionOperation.EXECUTE) {
      if (!request.executionRequest || typeof request.executionRequest !== 'object') {
        throw new InvalidExecutionOperationException(operation, "Execution request is required for execute operation");
      }
    }
    
    if (operation === ExecutionOperation.EXECUTE_BATCH) {
      if (!request.batchRequest || typeof request.batchRequest !== 'object') {
        throw new InvalidExecutionOperationException(operation, "Batch request is required for execute-batch operation");
      }
    }
    
    if ([ExecutionOperation.CANCEL, ExecutionOperation.STATUS].includes(operation)) {
      if (!request.executionId || typeof request.executionId !== 'string') {
        throw new InvalidExecutionOperationException(operation, "Execution ID is required for control operations");
      }
    }
    
    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request
    } as ExecutionOperationRequest;
  }

  private validateExecutionRequest(request: any): void {
    if (!request.agentId || typeof request.agentId !== 'string') {
      throw new InvalidExecutionContextException(['agentId']);
    }
    
    if (request.input === undefined) {
      throw new InvalidExecutionContextException(['input']);
    }
    
    if (!request.context || typeof request.context !== 'object') {
      throw new InvalidExecutionContextException(['context']);
    }
    
    const context = request.context;
    const requiredFields = ['requestId', 'traceId', 'workspaceId', 'userId'];
    const missingFields = requiredFields.filter(field => !context[field]);
    
    if (missingFields.length > 0) {
      throw new InvalidExecutionContextException(missingFields);
    }
  }

  private validateBatchRequest(request: any): void {
    if (!Array.isArray(request.requests) || request.requests.length === 0) {
      throw new InvalidExecutionOperationException("execute-batch", "Requests array is required and must not be empty");
    }
    
    // Validate each individual request
    request.requests.forEach((req: any, index: number) => {
      try {
        this.validateExecutionRequest(req);
      } catch (error) {
        throw new InvalidExecutionOperationException(
          "execute-batch", 
          `Invalid request at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
    
    if (request.maxConcurrency !== undefined && (typeof request.maxConcurrency !== 'number' || request.maxConcurrency < 1)) {
      throw new InvalidExecutionOperationException("execute-batch", "Max concurrency must be a positive number");
    }
    
    if (request.failFast !== undefined && typeof request.failFast !== 'boolean') {
      throw new InvalidExecutionOperationException("execute-batch", "Fail fast must be a boolean");
    }
  }

  private initializeMetrics(): void {
    Object.values(ExecutionOperation).forEach(operation => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: ExecutionOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(operation: ExecutionOperation, duration: number): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(operation: ExecutionOperation, duration: number): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }
}