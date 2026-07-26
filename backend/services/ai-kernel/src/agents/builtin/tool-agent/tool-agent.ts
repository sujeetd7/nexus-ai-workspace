import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext
} from "../../interfaces";
import { AgentType, AgentStatus, AgentPriority, AgentHealth, ExecutionResult, ExecutionStatus } from "../../types";
import {
  ToolOperation,
  BatchExecutionMode,
  ToolOperationRequest,
  ToolDiscoverRequest,
  ToolFindRequest,
  ToolListRequest,
  ToolExecuteRequest,
  ToolBatchExecuteRequest,
  ToolValidateRequest,
  ToolOperationResult,
  ToolDiscoverResult,
  ToolFindResult,
  ToolListResult,
  ToolExecuteResult,
  ToolBatchExecuteResult,
  ToolValidateResult,
  ToolAgentHealth,
  ToolAgentMetrics
} from "./tool-agent.types";
import {
  ToolAgentException,
  InvalidToolOperationException,
  ToolNotFoundException,
  ToolExecutionException,
  ToolValidationException,
  ToolRegistryUnavailableException,
  ToolExecutorUnavailableException,
  BatchExecutionException,
  InvalidToolContextException
} from "./tool-agent.exceptions";
import { ToolRegistry } from "../../../tools/registry/tool-registry";
import { EnhancedToolExecutor } from "../../../tools/runtime/enhanced-tool-executor";
import { EnhancedToolExecutionRequest } from "../../../tools/runtime/enhanced-tool-execution-request";
import { ToolExecutionResponse } from "../../../tools/runtime/tool-executor";
import { ITool } from "../../../tools/interfaces/tool.interface";

export interface ToolAgentComponents {
  toolRegistry: ToolRegistry;
  toolExecutor: EnhancedToolExecutor;
}

export class ToolAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];
  
  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();
  
  // Tool components
  private readonly components: ToolAgentComponents;
  
  // Metrics
  private readonly operationCounts: Record<ToolOperation, number> = {} as Record<ToolOperation, number>;
  private readonly successCounts: Record<ToolOperation, number> = {} as Record<ToolOperation, number>;
  private readonly errorCounts: Record<ToolOperation, number> = {} as Record<ToolOperation, number>;
  private readonly latencies: Record<ToolOperation, number[]> = {} as Record<ToolOperation, number[]>;
  private readonly toolUsage: Map<string, { executions: number; successes: number; failures: number; latencies: number[]; }> = new Map();
  
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  constructor(components: ToolAgentComponents) {
    this.metadata = {
      id: "tool-agent",
      name: "Tool Agent",
      description: "Built-in agent for tool discovery, execution, and batch operations using the existing Tool Registry and EnhancedToolExecutor",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["tools", "builtin", "execution"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.capabilities = [
      {
        id: "tool-discovery",
        name: "Tool Discovery",
        description: "Discover and find tools in the registry",
        inputSchema: { operation: "string", category: "string", tags: "array" },
        outputSchema: { success: "boolean", tools: "array" },
        parameters: { maxResults: 100 },
        dependencies: []
      },
      {
        id: "tool-execution",
        name: "Tool Execution",
        description: "Execute individual tools with input validation",
        inputSchema: { operation: "string", toolName: "string", input: "object" },
        outputSchema: { success: "boolean", output: "object" },
        parameters: { timeout: 30000, retries: 0 },
        dependencies: []
      },
      {
        id: "batch-execution",
        name: "Batch Execution",
        description: "Execute multiple tools in parallel or sequential mode",
        inputSchema: { operation: "string", executions: "array", mode: "string" },
        outputSchema: { success: "boolean", executions: "array" },
        parameters: { maxConcurrency: 10, failFast: false },
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
      if (!this.components.toolRegistry) {
        throw new ToolRegistryUnavailableException();
      }
      if (!this.components.toolExecutor) {
        throw new ToolExecutorUnavailableException();
      }
      
      this.agentStatus = AgentStatus.IDLE;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize tool agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new ToolAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;
      
      // Cleanup resources if needed
      // Tool components don't require special cleanup
      
      this.agentStatus = AgentStatus.STOPPED;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown tool agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new ToolAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      
      // Check tool registry health
      const allTools = this.components.toolRegistry.getAll();
      const enabledTools = allTools.filter(tool => tool.enabled);
      
      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.toolRegistry || !this.components.toolExecutor) {
        status = "unhealthy";
      } else if (this.warnings.length > 0 || enabledTools.length === 0) {
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
          totalTools: allTools.length,
          enabledTools: enabledTools.length,
          totalExecutions: Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0),
          successRate: this.calculateSuccessRate()
        }
      };
      
      return this.agentHealth;
      
    } catch (error) {
      const errorMsg = `Failed to get tool agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      let result: ToolOperationResult;
      
      switch (request.operation) {
        case ToolOperation.DISCOVER:
          result = await this.discoverTools(request as ToolDiscoverRequest, context);
          break;
        case ToolOperation.FIND:
          result = await this.findTool(request as ToolFindRequest, context);
          break;
        case ToolOperation.LIST:
          result = await this.listTools(request as ToolListRequest, context);
          break;
        case ToolOperation.EXECUTE:
          result = await this.executeTool(request as ToolExecuteRequest, context);
          break;
        case ToolOperation.EXECUTE_BATCH:
          result = await this.executeBatch(request as ToolBatchExecuteRequest, context);
          break;
        case ToolOperation.VALIDATE:
          result = await this.validateInput(request as ToolValidateRequest, context);
          break;
        default:
          throw new InvalidToolOperationException(request.operation as string, "Unsupported operation");
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
        this.recordOperationError(input.operation as ToolOperation, duration);
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

  // Individual tool operations
  public async discoverTools(request: ToolDiscoverRequest, context: IAgentExecutionContext): Promise<ToolDiscoverResult> {
    try {
      let tools = this.components.toolRegistry.getAll();
      
      // Apply filters
      if (request.category) {
        tools = tools.filter(tool => tool.category === request.category);
      }
      
      if (request.tags && request.tags.length > 0) {
        tools = tools.filter(tool => 
          request.tags!.some(tag => tool.tags.includes(tag))
        );
      }
      
      if (request.enabled !== undefined) {
        tools = tools.filter(tool => tool.enabled === request.enabled);
      }
      
      // Collect categories and tags
      const categories = [...new Set(tools.map(tool => tool.category))];
      const tags = [...new Set(tools.flatMap(tool => tool.tags))];
      
      return {
        success: true,
        operation: ToolOperation.DISCOVER,
        tools,
        totalCount: tools.length,
        categories,
        tags,
        metadata: {
          filtersApplied: {
            category: request.category,
            tags: request.tags,
            enabled: request.enabled
          },
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to discover tools: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw new ToolAgentException("discover", errorMsg);
    }
  }

  public async findTool(request: ToolFindRequest, context: IAgentExecutionContext): Promise<ToolFindResult> {
    try {
      const tool = this.components.toolRegistry.get(request.toolName);
      
      return {
        success: true,
        operation: ToolOperation.FIND,
        tool,
        found: tool !== undefined,
        metadata: {
          toolName: request.toolName,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to find tool '${request.toolName}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw new ToolAgentException("find", errorMsg);
    }
  }

  public async listTools(request: ToolListRequest, context: IAgentExecutionContext): Promise<ToolListResult> {
    try {
      let tools = this.components.toolRegistry.getAll();
      
      // Apply filters
      if (request.category) {
        tools = tools.filter(tool => tool.category === request.category);
      }
      
      if (request.enabled !== undefined) {
        tools = tools.filter(tool => tool.enabled === request.enabled);
      }
      
      const totalCount = tools.length;
      const offset = request.offset || 0;
      const limit = request.limit || totalCount;
      
      // Apply pagination
      tools = tools.slice(offset, offset + limit);
      
      return {
        success: true,
        operation: ToolOperation.LIST,
        tools,
        totalCount,
        offset,
        limit,
        metadata: {
          hasMore: offset + limit < totalCount,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw new ToolAgentException("list", errorMsg);
    }
  }

  public async executeTool(request: ToolExecuteRequest, context: IAgentExecutionContext): Promise<ToolExecuteResult> {
    const executedAt = new Date();
    const startTime = Date.now();
    
    try {
      // Check if tool exists
      const tool = this.components.toolRegistry.get(request.toolName);
      if (!tool) {
        throw new ToolNotFoundException(request.toolName);
      }
      
      // Build enhanced execution request
      const enhancedRequest: EnhancedToolExecutionRequest = {
        tool: request.toolName,
        input: request.input,
        requestId: context.requestId,
        context: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          traceId: context.traceId,
          sessionId: context.sessionId,
          metadata: context.metadata
        },
        options: {
          timeout: request.timeout,
          retries: request.retries,
          cancellationToken: context.cancellationToken
        }
      };
      
      // Execute tool using enhanced executor
      const response: ToolExecutionResponse = await this.components.toolExecutor.execute(enhancedRequest);
      
      const duration = Date.now() - startTime;
      
      // Record tool usage
      this.recordToolUsage(request.toolName, response.success, duration);
      
      if (!response.success) {
        throw new ToolExecutionException(request.toolName, response.error || "Unknown execution error");
      }
      
      return {
        success: true,
        operation: ToolOperation.EXECUTE,
        toolName: request.toolName,
        input: request.input,
        output: response.data,
        duration,
        executedAt,
        metadata: {
          toolId: tool.id,
          toolVersion: tool.version,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record tool usage failure
      this.recordToolUsage(request.toolName, false, duration);
      
      const errorMsg = error instanceof Error ? error.message : "Unknown tool execution error";
      throw new ToolExecutionException(request.toolName, errorMsg);
    }
  }

  public async executeBatch(request: ToolBatchExecuteRequest, context: IAgentExecutionContext): Promise<ToolBatchExecuteResult> {
    const executedAt = new Date();
    const totalStartTime = Date.now();
    
    try {
      const executions: ToolBatchExecuteResult['executions'] = [];
      let successfulExecutions = 0;
      let failedExecutions = 0;
      
      if (request.mode === BatchExecutionMode.PARALLEL) {
        // Execute tools in parallel
        const promises = request.executions.map(async (exec, index) => {
          const startTime = Date.now();
          
          try {
            const executeRequest: ToolExecuteRequest = {
              operation: ToolOperation.EXECUTE,
              toolName: exec.toolName,
              input: exec.input,
              timeout: exec.timeout,
              retries: exec.retries
            };
            
            const result = await this.executeTool(executeRequest, context);
            const duration = Date.now() - startTime;
            
            return {
              toolName: exec.toolName,
              input: exec.input,
              output: result.output,
              success: true,
              duration,
              index
            };
            
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            
            return {
              toolName: exec.toolName,
              input: exec.input,
              success: false,
              error: errorMsg,
              duration,
              index
            };
          }
        });
        
        // Wait for all executions with optional concurrency limit
        let results: Awaited<typeof promises[0]>[];
        
        if (request.maxConcurrency && request.maxConcurrency < promises.length) {
          // Execute with concurrency limit
          results = [];
          for (let i = 0; i < promises.length; i += request.maxConcurrency) {
            const batch = promises.slice(i, i + request.maxConcurrency);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
            
            // Check fail-fast
            if (request.failFast && batchResults.some(r => !r.success)) {
              break;
            }
          }
        } else {
          // Execute all at once
          results = await Promise.all(promises);
        }
        
        // Sort results back to original order and build executions array
        results.sort((a, b) => a.index - b.index);
        
        for (const result of results) {
          executions.push({
            toolName: result.toolName,
            input: result.input,
            output: result.output,
            success: result.success,
            error: result.error,
            duration: result.duration
          });
          
          if (result.success) {
            successfulExecutions++;
          } else {
            failedExecutions++;
          }
        }
        
      } else {
        // Execute tools sequentially
        for (const exec of request.executions) {
          const startTime = Date.now();
          
          try {
            const executeRequest: ToolExecuteRequest = {
              operation: ToolOperation.EXECUTE,
              toolName: exec.toolName,
              input: exec.input,
              timeout: exec.timeout,
              retries: exec.retries
            };
            
            const result = await this.executeTool(executeRequest, context);
            const duration = Date.now() - startTime;
            
            executions.push({
              toolName: exec.toolName,
              input: exec.input,
              output: result.output,
              success: true,
              duration
            });
            
            successfulExecutions++;
            
          } catch (error) {
            const duration = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            
            executions.push({
              toolName: exec.toolName,
              input: exec.input,
              success: false,
              error: errorMsg,
              duration
            });
            
            failedExecutions++;
            
            // Check fail-fast
            if (request.failFast) {
              break;
            }
          }
        }
      }
      
      const totalDuration = Date.now() - totalStartTime;
      
      return {
        success: failedExecutions === 0 || (!request.failFast && successfulExecutions > 0),
        operation: ToolOperation.EXECUTE_BATCH,
        mode: request.mode,
        executions,
        totalExecutions: executions.length,
        successfulExecutions,
        failedExecutions,
        totalDuration,
        executedAt,
        metadata: {
          failFast: request.failFast,
          maxConcurrency: request.maxConcurrency,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown batch execution error";
      const failedTools = request.executions.map(exec => exec.toolName);
      throw new BatchExecutionException(request.mode, failedTools, errorMsg);
    }
  }

  public async validateInput(request: ToolValidateRequest, context: IAgentExecutionContext): Promise<ToolValidateResult> {
    try {
      const tool = this.components.toolRegistry.get(request.toolName);
      if (!tool) {
        throw new ToolNotFoundException(request.toolName);
      }
      
      const inputErrors: string[] = [];
      const outputErrors: string[] = [];
      
      // Input validation
      let inputValid = true;
      if (request.validateInput !== false && tool.inputSchema) {
        // Basic validation - in real implementation would use proper schema validator
        try {
          if (!request.input || typeof request.input !== 'object') {
            inputErrors.push("Input must be an object");
            inputValid = false;
          }
          // Additional schema validation would go here
        } catch (error) {
          inputErrors.push(`Input validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          inputValid = false;
        }
      }
      
      // Output validation would be done after execution
      let outputValid: boolean | undefined;
      if (request.validateOutput && tool.outputSchema) {
        // Output validation would require actual execution
        outputValid = true; // Placeholder
      }
      
      return {
        success: inputValid && (outputValid !== false),
        operation: ToolOperation.VALIDATE,
        toolName: request.toolName,
        input: request.input,
        inputValid,
        outputValid,
        inputErrors,
        outputErrors,
        metadata: {
          hasInputSchema: !!tool.inputSchema,
          hasOutputSchema: !!tool.outputSchema,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to validate tool '${request.toolName}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      throw new ToolValidationException(request.toolName, [errorMsg]);
    }
  }

  public async getToolAgentHealth(): Promise<ToolAgentHealth> {
    try {
      const allTools = this.components.toolRegistry.getAll();
      const enabledTools = allTools.filter(tool => tool.enabled);
      
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.toolRegistry || !this.components.toolExecutor) {
        status = "unhealthy";
      } else if (this.warnings.length > 0 || enabledTools.length === 0) {
        status = "degraded";
      }
      
      return {
        toolRegistryAvailable: !!this.components.toolRegistry,
        executorAvailable: !!this.components.toolExecutor,
        registeredToolCount: allTools.length,
        enabledToolCount: enabledTools.length,
        status,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          toolCategories: [...new Set(allTools.map(tool => tool.category))],
          toolTags: [...new Set(allTools.flatMap(tool => tool.tags))]
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to get tool agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        toolRegistryAvailable: false,
        executorAvailable: false,
        registeredToolCount: 0,
        enabledToolCount: 0,
        status: "unhealthy",
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg }
      };
    }
  }

  public getMetrics(): ToolAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    
    // Calculate average latencies
    const averageLatencies: Record<ToolOperation, number> = {} as Record<ToolOperation, number>;
    Object.keys(this.latencies).forEach(op => {
      const operation = op as ToolOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });
    
    // Calculate tool usage stats
    const toolUsage: Record<string, { executions: number; successes: number; failures: number; averageLatency: number; }> = {};
    for (const [toolName, stats] of this.toolUsage.entries()) {
      toolUsage[toolName] = {
        executions: stats.executions,
        successes: stats.successes,
        failures: stats.failures,
        averageLatency: stats.latencies.length > 0 ? stats.latencies.reduce((sum, time) => sum + time, 0) / stats.latencies.length : 0
      };
    }
    
    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalExecutions: totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      toolUsage,
      batchExecutionStats: {
        totalBatches: this.operationCounts[ToolOperation.EXECUTE_BATCH] || 0,
        parallelBatches: 0, // Would need to track this separately
        sequentialBatches: 0, // Would need to track this separately
        averageBatchSize: 0, // Would need to track this separately
        averageBatchTime: averageLatencies[ToolOperation.EXECUTE_BATCH] || 0
      }
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): ToolOperationRequest {
    if (!input || typeof input !== 'object') {
      throw new InvalidToolOperationException("unknown", "Input must be an object");
    }
    
    const request = input as Record<string, unknown>;
    
    if (!request.operation || typeof request.operation !== 'string') {
      throw new InvalidToolOperationException("unknown", "Operation is required and must be a string");
    }
    
    if (!Object.values(ToolOperation).includes(request.operation as ToolOperation)) {
      throw new InvalidToolOperationException(request.operation as string, "Unsupported operation");
    }
    
    // Validate operation-specific requirements
    const operation = request.operation as ToolOperation;
    
    if (operation === ToolOperation.FIND && (!request.toolName || typeof request.toolName !== 'string')) {
      throw new InvalidToolOperationException(operation, "Tool name is required for find operation");
    }
    
    if (operation === ToolOperation.EXECUTE) {
      if (!request.toolName || typeof request.toolName !== 'string') {
        throw new InvalidToolOperationException(operation, "Tool name is required for execute operation");
      }
      if (request.input === undefined) {
        throw new InvalidToolOperationException(operation, "Input is required for execute operation");
      }
    }
    
    if (operation === ToolOperation.EXECUTE_BATCH) {
      if (!request.executions || !Array.isArray(request.executions)) {
        throw new InvalidToolOperationException(operation, "Executions array is required for batch execute operation");
      }
      if (!request.mode || !Object.values(BatchExecutionMode).includes(request.mode as BatchExecutionMode)) {
        throw new InvalidToolOperationException(operation, "Valid execution mode is required for batch execute operation");
      }
    }
    
    if (operation === ToolOperation.VALIDATE) {
      if (!request.toolName || typeof request.toolName !== 'string') {
        throw new InvalidToolOperationException(operation, "Tool name is required for validate operation");
      }
      if (request.input === undefined) {
        throw new InvalidToolOperationException(operation, "Input is required for validate operation");
      }
    }
    
    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request
    } as ToolOperationRequest;
  }

  private initializeMetrics(): void {
    Object.values(ToolOperation).forEach(operation => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: ToolOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(operation: ToolOperation, duration: number): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(operation: ToolOperation, duration: number): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordToolUsage(toolName: string, success: boolean, duration: number): void {
    if (!this.toolUsage.has(toolName)) {
      this.toolUsage.set(toolName, {
        executions: 0,
        successes: 0,
        failures: 0,
        latencies: []
      });
    }
    
    const stats = this.toolUsage.get(toolName)!;
    stats.executions++;
    stats.latencies.push(duration);
    
    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }
    
    // Keep only last 100 latency measurements per tool
    if (stats.latencies.length > 100) {
      stats.latencies.shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }
}