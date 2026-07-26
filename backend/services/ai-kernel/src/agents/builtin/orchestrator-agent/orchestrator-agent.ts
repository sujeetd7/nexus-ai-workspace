import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext
} from "../../interfaces";
import { AgentType, AgentStatus, AgentPriority, AgentHealth, ExecutionResult, ExecutionStatus } from "../../types";
import {
  OrchestratorOperation,
  OrchestratorOperationRequest,
  OrchestratorExecuteAgentRequest,
  OrchestratorExecuteWorkflowRequest,
  OrchestratorExecutePlanRequest,
  OrchestratorCancelExecutionRequest,
  GetHealthRequest,
  OrchestratorOperationResult,
  OrchestratorExecuteAgentResult,
  OrchestratorExecuteWorkflowResult,
  OrchestratorExecutePlanResult,
  OrchestratorCancelExecutionResult,
  GetHealthResult,
  OrchestratorAgentHealth,
  OrchestratorAgentMetrics
} from "./orchestrator-agent.types";
import {
  OrchestratorAgentException,
  InvalidOrchestratorOperationException,
  AgentExecutionAgentException,
  WorkflowExecutionAgentException,
  PlanExecutionAgentException,
  ExecutionCancellationAgentException,
  OrchestratorHealthAgentException,
  AgentOrchestratorUnavailableException,
  InvalidOrchestratorExecutionRequestException
} from "./orchestrator-agent.exceptions";
import { IAgentOrchestrator } from "../../orchestrator/agent-orchestrator";

export interface OrchestratorAgentComponents {
  agentOrchestrator: IAgentOrchestrator;
}

export class OrchestratorAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.HIGH;
  public readonly capabilities: IAgentCapability[];
  
  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();
  
  // Orchestrator components
  private readonly components: OrchestratorAgentComponents;
  
  // Metrics
  private readonly operationCounts: Record<OrchestratorOperation, number> = {} as Record<OrchestratorOperation, number>;
  private readonly successCounts: Record<OrchestratorOperation, number> = {} as Record<OrchestratorOperation, number>;
  private readonly errorCounts: Record<OrchestratorOperation, number> = {} as Record<OrchestratorOperation, number>;
  private readonly latencies: Record<OrchestratorOperation, number[]> = {} as Record<OrchestratorOperation, number[]>;
  
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;
  
  // Orchestration tracking
  private totalExecutions = 0;
  private agentExecutions = 0;
  private workflowExecutions = 0;
  private planExecutions = 0;
  private totalCancellations = 0;
  private successfulCancellations = 0;
  private totalHealthChecks = 0;

  constructor(components: OrchestratorAgentComponents) {
    this.metadata = {
      id: "orchestrator-agent",
      name: "Orchestrator Agent",
      description: "Built-in agent for orchestrating agent execution operations using the existing AgentOrchestrator infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["orchestrator", "builtin", "execution-control"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.capabilities = [
      {
        id: "agent-execution",
        name: "Agent Execution Orchestration",
        description: "Orchestrate individual agent execution with lifecycle and context management",
        inputSchema: { operation: "string", agentRequest: "object" },
        outputSchema: { success: "boolean", orchestratorExecution: "object" },
        parameters: { timeout: 300000 },
        dependencies: []
      },
      {
        id: "workflow-orchestration",
        name: "Workflow Orchestration", 
        description: "Orchestrate complex workflow execution with step coordination and state management",
        inputSchema: { operation: "string", workflowRequest: "object" },
        outputSchema: { success: "boolean", orchestratorExecution: "object" },
        parameters: { timeout: 600000 },
        dependencies: []
      },
      {
        id: "plan-orchestration",
        name: "Plan Orchestration",
        description: "Orchestrate plan execution with task scheduling and dependency management",
        inputSchema: { operation: "string", planRequest: "object" },
        outputSchema: { success: "boolean", orchestratorExecution: "object" },
        parameters: { timeout: 600000 },
        dependencies: []
      },
      {
        id: "execution-control",
        name: "Execution Control",
        description: "Control and monitor orchestrated executions with cancellation and health monitoring",
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
      if (!this.components.agentOrchestrator) {
        throw new AgentOrchestratorUnavailableException();
      }
      
      this.agentStatus = AgentStatus.IDLE;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize orchestrator agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new OrchestratorAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;
      
      // Cleanup resources if needed
      // Agent orchestrator doesn't require special cleanup
      
      this.agentStatus = AgentStatus.STOPPED;
      
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown orchestrator agent: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      throw new OrchestratorAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();
      
      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentOrchestrator) {
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
      const errorMsg = `Failed to get orchestrator agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      let result: OrchestratorOperationResult;
      
      switch (request.operation) {
        case OrchestratorOperation.EXECUTE:
          result = await this.executeAgent(request as OrchestratorExecuteAgentRequest, context);
          break;
        case OrchestratorOperation.EXECUTE_WORKFLOW:
          result = await this.executeWorkflow(request as OrchestratorExecuteWorkflowRequest, context);
          break;
        case OrchestratorOperation.EXECUTE_PLAN:
          result = await this.executePlan(request as OrchestratorExecutePlanRequest, context);
          break;
        case OrchestratorOperation.CANCEL:
          result = await this.cancelExecution(request as OrchestratorCancelExecutionRequest, context);
          break;
        case OrchestratorOperation.HEALTH:
          result = await this.getOrchestratorHealth(request as GetHealthRequest, context);
          break;
        default:
          throw new InvalidOrchestratorOperationException(request.operation as string, "Unsupported operation");
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
        this.recordOperationError(input.operation as OrchestratorOperation, duration);
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

  // Individual orchestration operations
  public async executeAgent(request: OrchestratorExecuteAgentRequest, context: IAgentExecutionContext): Promise<OrchestratorExecuteAgentResult> {
    const startedAt = new Date();
    
    try {
      // Validate agent execution request
      this.validateAgentExecutionRequest(request.agentRequest);
      
      // Execute using existing orchestrator
      const orchestratorExecution = await this.components.agentOrchestrator.execute(request.agentRequest);
      
      this.totalExecutions++;
      this.agentExecutions++;
      
      return {
        success: true,
        operation: OrchestratorOperation.EXECUTE,
        executionId: orchestratorExecution.executionId,
        agentId: request.agentRequest.agentId,
        orchestratorExecution,
        startedAt,
        metadata: {
          executionId: orchestratorExecution.executionId,
          agentId: request.agentRequest.agentId,
          status: orchestratorExecution.status,
          timestamp: startedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown agent execution error";
      throw new AgentExecutionAgentException(request.agentRequest.agentId, errorMsg);
    }
  }

  public async executeWorkflow(request: OrchestratorExecuteWorkflowRequest, context: IAgentExecutionContext): Promise<OrchestratorExecuteWorkflowResult> {
    const startedAt = new Date();
    
    try {
      // Validate workflow execution request
      this.validateWorkflowExecutionRequest(request.workflowRequest);
      
      // Execute using existing orchestrator
      const orchestratorExecution = await this.components.agentOrchestrator.executeWorkflow(request.workflowRequest);
      
      this.totalExecutions++;
      this.workflowExecutions++;
      
      return {
        success: true,
        operation: OrchestratorOperation.EXECUTE_WORKFLOW,
        executionId: orchestratorExecution.executionId,
        workflowId: request.workflowRequest.workflowId,
        orchestratorExecution,
        startedAt,
        metadata: {
          executionId: orchestratorExecution.executionId,
          workflowId: request.workflowRequest.workflowId,
          status: orchestratorExecution.status,
          timestamp: startedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown workflow execution error";
      throw new WorkflowExecutionAgentException(request.workflowRequest.workflowId, errorMsg);
    }
  }

  public async executePlan(request: OrchestratorExecutePlanRequest, context: IAgentExecutionContext): Promise<OrchestratorExecutePlanResult> {
    const startedAt = new Date();
    
    try {
      // Validate plan execution request
      this.validatePlanExecutionRequest(request.planRequest);
      
      // Execute using existing orchestrator
      const orchestratorExecution = await this.components.agentOrchestrator.executePlan(request.planRequest);
      
      this.totalExecutions++;
      this.planExecutions++;
      
      const planId = request.planRequest.plan?.planId || "unknown";
      
      return {
        success: true,
        operation: OrchestratorOperation.EXECUTE_PLAN,
        executionId: orchestratorExecution.executionId,
        planId,
        orchestratorExecution,
        startedAt,
        metadata: {
          executionId: orchestratorExecution.executionId,
          planId,
          status: orchestratorExecution.status,
          timestamp: startedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown plan execution error";
      const planId = request.planRequest.plan?.planId || "unknown";
      throw new PlanExecutionAgentException(planId, errorMsg);
    }
  }

  public async cancelExecution(request: OrchestratorCancelExecutionRequest, context: IAgentExecutionContext): Promise<OrchestratorCancelExecutionResult> {
    const cancelledAt = new Date();
    
    try {
      // Cancel using existing orchestrator
      const cancelled = await this.components.agentOrchestrator.cancel(request.executionId);
      
      this.totalCancellations++;
      if (cancelled) {
        this.successfulCancellations++;
      }
      
      return {
        success: true,
        operation: OrchestratorOperation.CANCEL,
        executionId: request.executionId,
        cancelled,
        cancelledAt,
        metadata: {
          executionId: request.executionId,
          cancelled,
          timestamp: cancelledAt
        }
      };
      
    } catch (error) {
      this.totalCancellations++;
      const errorMsg = error instanceof Error ? error.message : "Unknown execution cancellation error";
      throw new ExecutionCancellationAgentException(request.executionId, errorMsg);
    }
  }

  public async getOrchestratorHealth(request: GetHealthRequest, context: IAgentExecutionContext): Promise<GetHealthResult> {
    const retrievedAt = new Date();
    
    try {
      // Get health using existing orchestrator
      const orchestratorHealth = await this.components.agentOrchestrator.health();
      
      this.totalHealthChecks++;
      
      return {
        success: true,
        operation: OrchestratorOperation.HEALTH,
        orchestratorHealth,
        retrievedAt,
        metadata: {
          status: orchestratorHealth.status,
          state: orchestratorHealth.state,
          runningExecutions: orchestratorHealth.runningExecutions,
          totalExecutions: orchestratorHealth.totalExecutions,
          timestamp: retrievedAt
        }
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown orchestrator health error";
      throw new OrchestratorHealthAgentException(errorMsg);
    }
  }

  public async getOrchestratorAgentHealth(): Promise<OrchestratorAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      
      if (this.errors.length > 0 || !this.components.agentOrchestrator) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }
      
      // Get orchestrator health for additional details
      let orchestratorHealth;
      try {
        orchestratorHealth = await this.components.agentOrchestrator.health();
      } catch {
        orchestratorHealth = null;
      }
      
      return {
        orchestratorAvailable: !!this.components.agentOrchestrator,
        status,
        state: orchestratorHealth?.state || "unknown",
        runningExecutions: orchestratorHealth?.runningExecutions || 0,
        totalExecutions: orchestratorHealth?.totalExecutions || this.totalExecutions,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          agentExecutions: this.agentExecutions,
          workflowExecutions: this.workflowExecutions,
          planExecutions: this.planExecutions,
          totalCancellations: this.totalCancellations,
          successfulCancellations: this.successfulCancellations,
          totalHealthChecks: this.totalHealthChecks,
          uptime: Date.now() - this.startTime.getTime()
        }
      };
      
    } catch (error) {
      const errorMsg = `Failed to get orchestrator agent health: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMsg);
      
      return {
        orchestratorAvailable: false,
        status: "unhealthy",
        state: "error",
        runningExecutions: 0,
        totalExecutions: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg }
      };
    }
  }

  public getMetrics(): OrchestratorAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce((sum, count) => sum + count, 0);
    const totalSuccesses = Object.values(this.successCounts).reduce((sum, count) => sum + count, 0);
    const successRate = totalOperations > 0 ? totalSuccesses / totalOperations : 0;
    
    // Calculate average latencies
    const averageLatencies: Record<OrchestratorOperation, number> = {} as Record<OrchestratorOperation, number>;
    Object.keys(this.latencies).forEach(op => {
      const operation = op as OrchestratorOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] = times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });
    
    const successfulExecutions = this.successCounts[OrchestratorOperation.EXECUTE] + 
                                this.successCounts[OrchestratorOperation.EXECUTE_WORKFLOW] + 
                                this.successCounts[OrchestratorOperation.EXECUTE_PLAN];
    const failedExecutions = this.errorCounts[OrchestratorOperation.EXECUTE] + 
                           this.errorCounts[OrchestratorOperation.EXECUTE_WORKFLOW] + 
                           this.errorCounts[OrchestratorOperation.EXECUTE_PLAN];
    
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
        agentExecutions: this.agentExecutions,
        workflowExecutions: this.workflowExecutions,
        planExecutions: this.planExecutions,
        runningExecutions: 0, // Would need to get from orchestrator
        successfulExecutions,
        failedExecutions,
        cancelledExecutions: this.successfulCancellations,
        averageExecutionTime: (averageLatencies[OrchestratorOperation.EXECUTE] + 
                              averageLatencies[OrchestratorOperation.EXECUTE_WORKFLOW] + 
                              averageLatencies[OrchestratorOperation.EXECUTE_PLAN]) / 3
      },
      orchestrationStats: {
        totalCancellations: this.totalCancellations,
        successfulCancellations: this.successfulCancellations,
        totalHealthChecks: this.totalHealthChecks,
        orchestratorUptime: Date.now() - this.startTime.getTime(),
        componentAvailability: {
          agentRegistry: true, // Assumed since orchestrator manages
          lifecycleManager: true,
          scheduler: true,
          planner: true,
          workflowEngine: true,
          agentRuntime: true,
          communicationManager: true,
          memory: true
        }
      }
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): OrchestratorOperationRequest {
    if (!input || typeof input !== 'object') {
      throw new InvalidOrchestratorOperationException("unknown", "Input must be an object");
    }
    
    const request = input as Record<string, unknown>;
    
    if (!request.operation || typeof request.operation !== 'string') {
      throw new InvalidOrchestratorOperationException("unknown", "Operation is required and must be a string");
    }
    
    if (!Object.values(OrchestratorOperation).includes(request.operation as OrchestratorOperation)) {
      throw new InvalidOrchestratorOperationException(request.operation as string, "Unsupported operation");
    }
    
    // Validate operation-specific requirements
    const operation = request.operation as OrchestratorOperation;
    
    if (operation === OrchestratorOperation.EXECUTE) {
      if (!request.agentRequest || typeof request.agentRequest !== 'object') {
        throw new InvalidOrchestratorOperationException(operation, "Agent request is required for execute operation");
      }
    }
    
    if (operation === OrchestratorOperation.EXECUTE_WORKFLOW) {
      if (!request.workflowRequest || typeof request.workflowRequest !== 'object') {
        throw new InvalidOrchestratorOperationException(operation, "Workflow request is required for execute-workflow operation");
      }
    }
    
    if (operation === OrchestratorOperation.EXECUTE_PLAN) {
      if (!request.planRequest || typeof request.planRequest !== 'object') {
        throw new InvalidOrchestratorOperationException(operation, "Plan request is required for execute-plan operation");
      }
    }
    
    if (operation === OrchestratorOperation.CANCEL) {
      if (!request.executionId || typeof request.executionId !== 'string') {
        throw new InvalidOrchestratorOperationException(operation, "Execution ID is required for cancel operation");
      }
    }
    
    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request
    } as OrchestratorOperationRequest;
  }

  private validateAgentExecutionRequest(request: any): void {
    const requiredFields = ['agentId', 'input', 'context'];
    const missingFields = requiredFields.filter(field => !(field in request) || request[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new InvalidOrchestratorExecutionRequestException(missingFields);
    }
  }

  private validateWorkflowExecutionRequest(request: any): void {
    const requiredFields = ['workflowId', 'input', 'context'];
    const missingFields = requiredFields.filter(field => !(field in request) || request[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new InvalidOrchestratorExecutionRequestException(missingFields);
    }
  }

  private validatePlanExecutionRequest(request: any): void {
    const requiredFields = ['plan', 'context'];
    const missingFields = requiredFields.filter(field => !(field in request) || request[field] === undefined);
    
    if (missingFields.length > 0) {
      throw new InvalidOrchestratorExecutionRequestException(missingFields);
    }
    
    if (!request.plan.planId) {
      throw new InvalidOrchestratorExecutionRequestException(['plan.planId']);
    }
  }

  private initializeMetrics(): void {
    Object.values(OrchestratorOperation).forEach(operation => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: OrchestratorOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(operation: OrchestratorOperation, duration: number): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);
    
    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(operation: OrchestratorOperation, duration: number): void {
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