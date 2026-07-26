import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext
} from "../../interfaces";
import { AgentType, AgentStatus, AgentPriority, AgentHealth, ExecutionResult, ExecutionStatus } from "../../types";
import {
  CoordinatorOperation,
  CoordinatorOperationRequest,
  CoordinatorAssignRequest,
  CoordinatorDelegateRequest,
  CoordinatorHandoffRequest,
  CoordinatorBroadcastRequest,
  CoordinatorCollectRequest,
  CoordinatorCancelRequest,
  CoordinatorOperationResult,
  CoordinatorAssignResult,
  CoordinatorDelegateResult,
  CoordinatorHandoffResult,
  CoordinatorBroadcastResult,
  CoordinatorCollectResult,
  CoordinatorCancelResult,
  CoordinatorAgentHealth,
  CoordinatorAgentMetrics
} from "./coordinator-agent.types";
import {
  CoordinatorAgentException,
  InvalidCoordinatorOperationException,
  CoordinatorAssignmentException,
  CoordinatorDelegationException,
  CoordinatorHandoffException,
  CoordinatorBroadcastException,
  CoordinatorCollectionException,
  CoordinatorCancellationException,
  AgentCoordinatorUnavailableException,
  InvalidCoordinationContextException
} from "./coordinator-agent.exceptions";
import { IAgentCoordinator } from "../../coordinator/agent-coordinator";

export interface CoordinatorAgentComponents {
  agentCoordinator: IAgentCoordinator;
}

export class CoordinatorAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];
  
  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();
  
  // Coordination components
  private readonly components: CoordinatorAgentComponents;
  
  // Metrics
  private readonly operationCounts: Record<CoordinatorOperation, number> = {} as Record<CoordinatorOperation, number>;
  private readonly successCounts: Record<CoordinatorOperation, number> = {} as Record<CoordinatorOperation, number>;
  private readonly errorCounts: Record<CoordinatorOperation, number> = {} as Record<CoordinatorOperation, number>;
  private readonly latencies: Record<CoordinatorOperation, number[]> = {} as Record<CoordinatorOperation, number[]>;
  
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;
  
  // Coordination tracking
  private totalCoordinations = 0;
  private parallelCoordinations = 0;
  private sequentialCoordinations = 0;
  private votingCoordinations = 0;
  private quorumCoordinations = 0;
  private totalDelegations = 0;
  private totalHandoffs = 0;
  private totalBroadcasts = 0;
  private totalCollections = 0;
  private totalCancellations = 0;
  private agentParticipations = 0;

  constructor(components: CoordinatorAgentComponents) {
    this.metadata = {
      id: "coordinator-agent",
      name: "Coordinator Agent",
      description: "Built-in agent for multi-agent coordination operations using the existing AgentCoordinator infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["coordination", "builtin", "multi-agent"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.capabilities = [
      {
        id: "coordination-assignment",
        name: "Coordination Assignment",
        description: "Assign coordination tasks to multiple agents with strategy-based execution",
        inputSchema: { operation: "string", coordinationRequest: "object" },
        outputSchema: { success: "boolean", result: "object" },
        parameters: { timeout: 600000 },
        dependencies: []
      },
      {
        id: "task-delegation",
        name: "Task Delegation", 
        description: "Delegate individual tasks to specific agents with context propagation",
        inputSchema: { operation: "string", agentId: "string", task: "object", context: "object" },
        outputSchema: { success: "boolean", executionId: "string" },
        parameters: { timeout: 300000 },
        dependencies: []
      },
      {
        id: "agent-communication",
        name: "Agent Communication",
        description: "Handle agent handoffs and broadcast communications",
        inputSchema: { operation: "string", request: "object" },
        outputSchema: { success: "boolean", result: "object" },
        parameters: {},
        dependencies: []
      },
      {
        id: "coordination-control",
        name: "Coordination Control",
        description: "Control and monitor coordination processes with collect and cancel operations",
        inputSchema: { operation: "string", coordinationId: "string" },
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
      if (!this.components.agentCoordinator) {
        throw new AgentCoordinatorUnavailableException();
      }
      
      this.agentStatus = AgentStatus.IDLE;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize coordinator agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new CoordinatorAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;
      
      // Cleanup resources if needed
      // Agent coordinator doesn't require special cleanup
      
      this.agentStatus = AgentStatus.STOPPED;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown coordinator agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new CoordinatorAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      
      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentCoordinator) {
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
          totalCoordinations: this.totalCoordinations,
          totalOperations: Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0),
          successRate: this.calculateSuccessRate()
        }
      };
      
      return this.agentHealth;
      
    } catch (error) {
      const errorMsg = `Failed to get coordinator agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      let result: CoordinatorOperationResult;
      
      switch (request.operation) {
        case CoordinatorOperation.ASSIGN:
          result = await this.assignCoordination(request as CoordinatorAssignRequest, context);
          break;
        case CoordinatorOperation.DELEGATE:
          result = await this.delegateTask(request as CoordinatorDelegateRequest, context);
          break;
        case CoordinatorOperation.HANDOFF:
          result = await this.handoffAgent(request as CoordinatorHandoffRequest, context);
          break;
        case CoordinatorOperation.BROADCAST:
          result = await this.broadcastMessage(request as CoordinatorBroadcastRequest, context);
          break;
        case CoordinatorOperation.COLLECT:
          result = await this.collectResults(request as CoordinatorCollectRequest, context);
          break;
        case CoordinatorOperation.CANCEL:
          result = await this.cancelCoordination(request as CoordinatorCancelRequest, context);
          break;
        default:
          throw new InvalidCoordinatorOperationException(request.operation as string, "Unsupported operation");
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
        this.recordOperationError(input.operation as CoordinatorOperation, duration);
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

  // Individual coordination operations
  public async assignCoordination(request: CoordinatorAssignRequest, context: IAgentExecutionContext): Promise<CoordinatorAssignResult> {
    const assignedAt = new Date();
    
    try {
      // Validate coordination request
      this.validateCoordinationRequest(request.coordinationRequest);
      
      // Assign using existing coordinator
      const result = await this.components.agentCoordinator.assign(request.coordinationRequest);
      
      this.totalCoordinations++;
      this.agentParticipations += request.coordinationRequest.agentIds.length;
      
      // Track coordination strategy
      switch (request.coordinationRequest.strategy) {
        case 'parallel':
          this.parallelCoordinations++;
          break;
        case 'sequential':
          this.sequentialCoordinations++;
          break;
        case 'majority_voting':
        case 'first_success':
        case 'all_success':
          this.votingCoordinations++;
          break;
        case 'quorum':
          this.quorumCoordinations++;
          break;
      }
      
      return {
        success: true,
        operation: CoordinatorOperation.ASSIGN,
        coordinationId: result.coordinationId,
        agentCount: request.coordinationRequest.agentIds.length,
        result,
        assignedAt,
        metadata: {
          coordinationId: result.coordinationId,
          strategy: request.coordinationRequest.strategy,
          agentCount: request.coordinationRequest.agentIds.length,
          timestamp: assignedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown coordination assignment error";
      throw new CoordinatorAssignmentException(request.coordinationRequest.agentIds, errorMsg);
    }
  }

  public async delegateTask(request: CoordinatorDelegateRequest, context: IAgentExecutionContext): Promise<CoordinatorDelegateResult> {
    const delegatedAt = new Date();
    
    try {
      // Validate delegation request
      this.validateDelegationRequest(request);
      
      // Delegate using existing coordinator
      const result = await this.components.agentCoordinator.delegate(
        request.agentId,
        request.task,
        request.context
      );
      
      this.totalDelegations++;
      
      return {
        success: true,
        operation: CoordinatorOperation.DELEGATE,
        agentId: request.agentId,
        executionId: result.executionId,
        delegatedAt,
        metadata: {
          agentId: request.agentId,
          executionId: result.executionId,
          success: result.success,
          timestamp: delegatedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown task delegation error";
      throw new CoordinatorDelegationException(request.agentId, errorMsg);
    }
  }

  public async handoffAgent(request: CoordinatorHandoffRequest, context: IAgentExecutionContext): Promise<CoordinatorHandoffResult> {
    const handedOffAt = new Date();
    
    try {
      // Validate handoff request
      this.validateHandoffRequest(request.handoffRequest);
      
      // Handoff using existing coordinator
      const result = await this.components.agentCoordinator.handoff(request.handoffRequest);
      
      this.totalHandoffs++;
      
      return {
        success: true,
        operation: CoordinatorOperation.HANDOFF,
        fromAgentId: request.handoffRequest.fromAgentId,
        toAgentId: request.handoffRequest.toAgentId,
        result,
        handedOffAt,
        metadata: {
          fromAgentId: request.handoffRequest.fromAgentId,
          toAgentId: request.handoffRequest.toAgentId,
          success: result.success,
          timestamp: handedOffAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown agent handoff error";
      throw new CoordinatorHandoffException(
        request.handoffRequest.fromAgentId,
        request.handoffRequest.toAgentId,
        errorMsg
      );
    }
  }

  public async broadcastMessage(request: CoordinatorBroadcastRequest, context: IAgentExecutionContext): Promise<CoordinatorBroadcastResult> {
    const broadcastAt = new Date();
    
    try {
      // Validate broadcast request
      this.validateBroadcastRequest(request.broadcastRequest);
      
      // Broadcast using existing coordinator
      const result = await this.components.agentCoordinator.broadcast(request.broadcastRequest);
      
      this.totalBroadcasts++;
      
      return {
        success: true,
        operation: CoordinatorOperation.BROADCAST,
        recipientCount: request.broadcastRequest.agentIds.length,
        result,
        broadcastAt,
        metadata: {
          recipientCount: request.broadcastRequest.agentIds.length,
          messageType: typeof request.broadcastRequest.message === 'object' && request.broadcastRequest.message !== null && 'type' in request.broadcastRequest.message 
            ? (request.broadcastRequest.message as any).type 
            : 'unknown',
          timestamp: broadcastAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown broadcast error";
      throw new CoordinatorBroadcastException(request.broadcastRequest.agentIds.length, errorMsg);
    }
  }

  public async collectResults(request: CoordinatorCollectRequest, context: IAgentExecutionContext): Promise<CoordinatorCollectResult> {
    const collectedAt = new Date();
    
    try {
      // Collect using existing coordinator
      const result = await this.components.agentCoordinator.collect(request.coordinationId);
      
      this.totalCollections++;
      
      return {
        success: true,
        operation: CoordinatorOperation.COLLECT,
        coordinationId: request.coordinationId,
        result,
        collectedAt,
        metadata: {
          coordinationId: request.coordinationId,
          resultCount: Object.keys(result.agentResults || {}).length,
          timestamp: collectedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown result collection error";
      throw new CoordinatorCollectionException(request.coordinationId, errorMsg);
    }
  }

  public async cancelCoordination(request: CoordinatorCancelRequest, context: IAgentExecutionContext): Promise<CoordinatorCancelResult> {
    const cancelledAt = new Date();
    
    try {
      // Cancel using existing coordinator
      const cancelled = await this.components.agentCoordinator.cancel(request.coordinationId);
      
      if (cancelled) {
        this.totalCancellations++;
      }
      
      return {
        success: true,
        operation: CoordinatorOperation.CANCEL,
        coordinationId: request.coordinationId,
        cancelled,
        cancelledAt,
        metadata: {
          coordinationId: request.coordinationId,
          cancelled,
          timestamp: cancelledAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown coordination cancellation error";
      throw new CoordinatorCancellationException(request.coordinationId, errorMsg);
    }
  }

  public async getCoordinatorAgentHealth(): Promise<CoordinatorAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentCoordinator) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      // Try to get coordinator health for additional details
      let coordinatorHealth;
      try {
        coordinatorHealth = await this.components.agentCoordinator.health();
      } catch {
        coordinatorHealth = null;
      }
      
      return {
        coordinatorAvailable: !!this.components.agentCoordinator,
        agentRegistryAvailable: true, // Assumed since coordinator manages registry
        runtimeAvailable: true, // Assumed since coordinator manages runtime
        communicationAvailable: true, // Assumed since coordinator manages communication
        status,
        totalCoordinations: this.totalCoordinations,
        activeCoordinations: coordinatorHealth?.activeCoordinations || 0,
        completedCoordinations: this.successCounts[CoordinatorOperation.ASSIGN] || 0,
        failedCoordinations: this.errorCounts[CoordinatorOperation.ASSIGN] || 0,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          parallelCoordinations: this.parallelCoordinations,
          sequentialCoordinations: this.sequentialCoordinations,
          votingCoordinations: this.votingCoordinations,
          quorumCoordinations: this.quorumCoordinations,
          totalDelegations: this.totalDelegations,
          totalHandoffs: this.totalHandoffs,
          totalBroadcasts: this.totalBroadcasts,
          totalCollections: this.totalCollections,
          agentParticipations: this.agentParticipations
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to get coordinator agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        coordinatorAvailable: false,
        agentRegistryAvailable: false,
        runtimeAvailable: false,
        communicationAvailable: false,
        status: "unhealthy",
        totalCoordinations: 0,
        activeCoordinations: 0,
        completedCoordinations: 0,
        failedCoordinations: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg }
      };
    }
  }

  public getMetrics(): CoordinatorAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    
    // Calculate average latencies
    const averageLatencies: Record<CoordinatorOperation, number> = {} as Record<CoordinatorOperation, number>;
    Object.keys(this.latencies).forEach(op => {
      const operation = op as CoordinatorOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });
    
    const successfulCoordinations = this.successCounts[CoordinatorOperation.ASSIGN] || 0;
    const failedCoordinations = this.errorCounts[CoordinatorOperation.ASSIGN] || 0;
    
    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      coordinationStats: {
        totalCoordinations: this.totalCoordinations,
        parallelCoordinations: this.parallelCoordinations,
        sequentialCoordinations: this.sequentialCoordinations,
        votingCoordinations: this.votingCoordinations,
        quorumCoordinations: this.quorumCoordinations,
        averageCoordinationTime: averageLatencies[CoordinatorOperation.ASSIGN] || 0,
        successfulCoordinations,
        failedCoordinations,
        timedOutCoordinations: 0, // Would need to track this from coordinator
        cancelledCoordinations: this.totalCancellations
      },
      operationStats: {
        totalDelegations: this.totalDelegations,
        totalHandoffs: this.totalHandoffs,
        totalBroadcasts: this.totalBroadcasts,
        totalCollections: this.totalCollections,
        totalCancellations: this.totalCancellations,
        averageAgentsPerCoordination: this.totalCoordinations > 0 ? this.agentParticipations / this.totalCoordinations : 0,
        delegationSuccessRate: this.calculateOperationSuccessRate(CoordinatorOperation.DELEGATE),
        handoffSuccessRate: this.calculateOperationSuccessRate(CoordinatorOperation.HANDOFF),
        broadcastSuccessRate: this.calculateOperationSuccessRate(CoordinatorOperation.BROADCAST)
      }
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): CoordinatorOperationRequest {
    if (!input || typeof input !== 'object') {
      throw new InvalidCoordinatorOperationException("unknown", "Input must be an object");
    }
    
    const request = input as Record<string, unknown>;
    
    if (!request.operation || typeof request.operation !== 'string') {
      throw new InvalidCoordinatorOperationException("unknown", "Operation is required and must be a string");
    }
    
    if (!Object.values(CoordinatorOperation).includes(request.operation as CoordinatorOperation)) {
      throw new InvalidCoordinatorOperationException(request.operation as string, "Unsupported operation");
    }
    
    // Validate operation-specific requirements
    const operation = request.operation as CoordinatorOperation;
    
    if (operation === CoordinatorOperation.ASSIGN) {
      if (!request.coordinationRequest || typeof request.coordinationRequest !== 'object') {
        throw new InvalidCoordinatorOperationException(operation, "Coordination request is required for assign operation");
      }
    }
    
    if (operation === CoordinatorOperation.DELEGATE) {
      if (!request.agentId || typeof request.agentId !== 'string') {
        throw new InvalidCoordinatorOperationException(operation, "Agent ID is required for delegate operation");
      }
      if (request.task === undefined) {
        throw new InvalidCoordinatorOperationException(operation, "Task is required for delegate operation");
      }
      if (!request.context || typeof request.context !== 'object') {
        throw new InvalidCoordinatorOperationException(operation, "Context is required for delegate operation");
      }
    }
    
    if (operation === CoordinatorOperation.HANDOFF) {
      if (!request.handoffRequest || typeof request.handoffRequest !== 'object') {
        throw new InvalidCoordinatorOperationException(operation, "Handoff request is required for handoff operation");
      }
    }
    
    if (operation === CoordinatorOperation.BROADCAST) {
      if (!request.broadcastRequest || typeof request.broadcastRequest !== 'object') {
        throw new InvalidCoordinatorOperationException(operation, "Broadcast request is required for broadcast operation");
      }
    }
    
    if ([CoordinatorOperation.COLLECT, CoordinatorOperation.CANCEL].includes(operation)) {
      if (!request.coordinationId || typeof request.coordinationId !== 'string') {
        throw new InvalidCoordinatorOperationException(operation, "Coordination ID is required for control operations");
      }
    }
    
    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request
    } as CoordinatorOperationRequest;
  }

  private validateCoordinationRequest(request: any): void {
    if (!Array.isArray(request.agentIds) || request.agentIds.length === 0) {
      throw new InvalidCoordinationContextException(['agentIds']);
    }
    
    if (request.input === undefined) {
      throw new InvalidCoordinationContextException(['input']);
    }
    
    if (!request.strategy || typeof request.strategy !== 'string') {
      throw new InvalidCoordinationContextException(['strategy']);
    }
    
    if (!request.context || typeof request.context !== 'object') {
      throw new InvalidCoordinationContextException(['context']);
    }
    
    const context = request.context;
    const requiredFields = ['coordinationId', 'requestId', 'traceId', 'workspaceId', 'userId', 'executionId'];
    const missingFields = requiredFields.filter(field => !(field in context) || !context[field as keyof typeof context]);
    
    if (missingFields.length > 0) {
      throw new InvalidCoordinationContextException(missingFields);
    }
  }

  private validateDelegationRequest(request: CoordinatorDelegateRequest): void {
    if (!request.agentId || typeof request.agentId !== 'string') {
      throw new InvalidCoordinationContextException(['agentId']);
    }
    
    if (request.task === undefined) {
      throw new InvalidCoordinationContextException(['task']);
    }
    
    if (!request.context || typeof request.context !== 'object') {
      throw new InvalidCoordinationContextException(['context']);
    }
    
    const context = request.context;
    const requiredFields = ['coordinationId', 'requestId', 'traceId', 'workspaceId', 'userId', 'executionId'];
    const missingFields = requiredFields.filter(field => !(field in context) || !context[field as keyof typeof context]);
    
    if (missingFields.length > 0) {
      throw new InvalidCoordinationContextException(missingFields);
    }
  }

  private validateHandoffRequest(request: any): void {
    if (!request.fromAgentId || typeof request.fromAgentId !== 'string') {
      throw new InvalidCoordinationContextException(['fromAgentId']);
    }
    
    if (!request.toAgentId || typeof request.toAgentId !== 'string') {
      throw new InvalidCoordinationContextException(['toAgentId']);
    }
    
    if (!request.context || typeof request.context !== 'object') {
      throw new InvalidCoordinationContextException(['context']);
    }
  }

  private validateBroadcastRequest(request: any): void {
    if (!Array.isArray(request.agentIds) || request.agentIds.length === 0) {
      throw new InvalidCoordinationContextException(['agentIds']);
    }
    
    if (!request.message || typeof request.message !== 'object') {
      throw new InvalidCoordinationContextException(['message']);
    }
    
    if (!request.context || typeof request.context !== 'object') {
      throw new InvalidCoordinationContextException(['context']);
    }
  }

  private initializeMetrics(): void {
    Object.values(CoordinatorOperation).forEach(operation => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: CoordinatorOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(operation: CoordinatorOperation, duration: number): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(operation: CoordinatorOperation, duration: number): void {
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

  private calculateOperationSuccessRate(operation: CoordinatorOperation): number {
    const totalOps = this.operationCounts[operation];
    const successOps = this.successCounts[operation];
    return totalOps > 0 ? successOps / totalOps : 0;
  }
}