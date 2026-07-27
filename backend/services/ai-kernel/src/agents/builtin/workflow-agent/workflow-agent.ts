import { randomUUID } from "crypto";
import {
  IAgent,
  IAgentMetadata,
  IAgentCapability,
  IAgentExecutionContext,
} from "../../interfaces";
import {
  AgentType,
  AgentStatus,
  AgentPriority,
  AgentHealth,
  ExecutionResult,
  ExecutionStatus,
} from "../../types";
import {
  WorkflowOperation,
  WorkflowOperationRequest,
  WorkflowExecuteRequest,
  WorkflowValidateRequest,
  WorkflowPauseRequest,
  WorkflowResumeRequest,
  WorkflowCancelRequest,
  WorkflowOperationResult,
  WorkflowExecuteResult,
  WorkflowValidateResult,
  WorkflowPauseResult,
  WorkflowResumeResult,
  WorkflowCancelResult,
  WorkflowAgentHealth,
  WorkflowAgentMetrics,
} from "./workflow-agent.types";
import {
  WorkflowAgentException,
  InvalidWorkflowOperationException,
  WorkflowAgentExecutionException,
  WorkflowValidationAgentException,
  WorkflowControlException,
  WorkflowEngineUnavailableException,
  InvalidWorkflowContextException,
} from "./workflow-agent.exceptions";
import {
  IWorkflowEngine,
  WorkflowValidationResult,
} from "../../workflow/workflow.interface";
import { WorkflowExecutionContext } from "../../workflow/workflow.types";

export interface WorkflowAgentComponents {
  workflowEngine: IWorkflowEngine;
}

export class WorkflowAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];

  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();

  // Workflow components
  private readonly components: WorkflowAgentComponents;

  // Metrics
  private readonly operationCounts: Record<WorkflowOperation, number> =
    {} as Record<WorkflowOperation, number>;
  private readonly successCounts: Record<WorkflowOperation, number> =
    {} as Record<WorkflowOperation, number>;
  private readonly errorCounts: Record<WorkflowOperation, number> =
    {} as Record<WorkflowOperation, number>;
  private readonly latencies: Record<WorkflowOperation, number[]> =
    {} as Record<WorkflowOperation, number[]>;

  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  // Workflow tracking
  private totalExecutions = 0;
  private totalValidations = 0;
  private validWorkflows = 0;
  private invalidWorkflows = 0;
  private totalPauses = 0;
  private totalResumes = 0;
  private totalCancellations = 0;

  constructor(components: WorkflowAgentComponents) {
    this.metadata = {
      id: "workflow-agent",
      name: "Workflow Agent",
      description:
        "Built-in agent for workflow operations using the existing WorkflowEngine infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["workflow", "builtin", "orchestration"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capabilities = [
      {
        id: "workflow-execution",
        name: "Workflow Execution",
        description:
          "Execute workflows with step coordination and state management",
        inputSchema: {
          operation: "string",
          workflowId: "string",
          input: "object",
          context: "object",
        },
        outputSchema: { success: "boolean", execution: "object" },
        parameters: { timeout: 300000 },
        dependencies: [],
      },
      {
        id: "workflow-validation",
        name: "Workflow Validation",
        description:
          "Validate workflow definitions for correctness and completeness",
        inputSchema: { operation: "string", workflow: "object" },
        outputSchema: { success: "boolean", valid: "boolean", errors: "array" },
        parameters: {},
        dependencies: [],
      },
      {
        id: "workflow-control",
        name: "Workflow Control",
        description:
          "Control workflow execution with pause, resume, and cancel operations",
        inputSchema: { operation: "string", executionId: "string" },
        outputSchema: { success: "boolean", status: "string" },
        parameters: {},
        dependencies: [],
      },
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
      metrics: {},
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
      if (!this.components.workflowEngine) {
        throw new WorkflowEngineUnavailableException();
      }

      this.agentStatus = AgentStatus.IDLE;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize workflow agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new WorkflowAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;

      // Cleanup resources if needed
      // Workflow engine doesn't require special cleanup

      this.agentStatus = AgentStatus.STOPPED;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown workflow agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new WorkflowAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.workflowEngine) {
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
          totalOperations: Object.values(this.operationCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
          successRate: this.calculateSuccessRate(),
        },
      };

      return this.agentHealth;
    } catch (error) {
      const errorMsg = `Failed to get workflow agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        status: "unhealthy",
        uptime: Date.now() - this.startTime.getTime(),
        lastHeartbeat: new Date(),
        memoryUsage: 0,
        cpuUsage: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        metrics: { error: 1 },
      };
    }
  }

  public async updateStatus(status: AgentStatus): Promise<void> {
    this.agentStatus = status;
  }

  public hasCapability(capabilityId: string): boolean {
    return this.capabilities.some((cap) => cap.id === capabilityId);
  }

  public getCapability(capabilityId: string): IAgentCapability | undefined {
    return this.capabilities.find((cap) => cap.id === capabilityId);
  }

  public listCapabilities(): IAgentCapability[] {
    return [...this.capabilities];
  }

  // Main execution method - determines which operation to execute based on input
  public async execute(
    input: unknown,
    context: IAgentExecutionContext,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    this.lastActivity = new Date();

    try {
      // Validate input
      const request = this.validateAndParseRequest(input);

      // Record operation attempt
      this.recordOperationAttempt(request.operation);

      // Execute operation
      let result: WorkflowOperationResult;

      switch (request.operation) {
        case WorkflowOperation.EXECUTE_WORKFLOW:
          result = await this.executeWorkflow(
            request as WorkflowExecuteRequest,
            context,
          );
          break;
        case WorkflowOperation.VALIDATE_WORKFLOW:
          result = await this.validateWorkflow(
            request as WorkflowValidateRequest,
            context,
          );
          break;
        case WorkflowOperation.PAUSE_WORKFLOW:
          result = await this.pauseWorkflow(
            request as WorkflowPauseRequest,
            context,
          );
          break;
        case WorkflowOperation.RESUME_WORKFLOW:
          result = await this.resumeWorkflow(
            request as WorkflowResumeRequest,
            context,
          );
          break;
        case WorkflowOperation.CANCEL_WORKFLOW:
          result = await this.cancelWorkflow(
            request as WorkflowCancelRequest,
            context,
          );
          break;
        default:
          throw new InvalidWorkflowOperationException(
            request.operation as string,
            "Unsupported operation",
          );
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
        status: result.success
          ? ExecutionStatus.COMPLETED
          : ExecutionStatus.FAILED,
        metadata: {
          operation: request.operation,
          ...result.metadata,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg =
        error instanceof Error ? error.message : "Unknown execution error";

      // Record error
      if (input && typeof input === "object" && "operation" in input) {
        this.recordOperationError(
          input.operation as WorkflowOperation,
          duration,
        );
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
        metadata: { error: errorMsg },
      };
    }
  }

  // Individual workflow operations
  public async executeWorkflow(
    request: WorkflowExecuteRequest,
    context: IAgentExecutionContext,
  ): Promise<WorkflowExecuteResult> {
    const startedAt = new Date();

    try {
      // Build workflow execution context
      const workflowContext: WorkflowExecutionContext = {
        executionId: randomUUID(),
        requestId: context.requestId,
        traceId: context.traceId,
        workspaceId: context.workspaceId,
        conversationId: context.conversationId,
        userId: context.userId,
        agentId: this.metadata.id,
        startTime: startedAt,
        variables: {
          ...(request.context.variables || {}),
          ...(request.context.timeout && { timeout: request.context.timeout }),
        },
        metadata: {
          ...context.metadata,
          ...request.metadata,
        },
      };

      // Execute workflow using existing engine
      const execution = await this.components.workflowEngine.execute(
        request.workflowId,
        request.input,
        workflowContext,
      );

      this.totalExecutions++;

      return {
        success: true,
        operation: WorkflowOperation.EXECUTE_WORKFLOW,
        workflowId: request.workflowId,
        executionId: execution.executionId,
        execution,
        startedAt,
        metadata: {
          workflowId: request.workflowId,
          executionId: execution.executionId,
          timestamp: startedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown workflow execution error";
      throw new WorkflowAgentExecutionException(request.workflowId, errorMsg);
    }
  }

  public async validateWorkflow(
    request: WorkflowValidateRequest,
    context: IAgentExecutionContext,
  ): Promise<WorkflowValidateResult> {
    const validatedAt = new Date();

    try {
      // Use existing workflow engine to validate
      const validationResult: WorkflowValidationResult =
        await this.components.workflowEngine.validate(request.workflow);

      this.totalValidations++;
      if (validationResult.valid) {
        this.validWorkflows++;
      } else {
        this.invalidWorkflows++;
      }

      return {
        success: true,
        operation: WorkflowOperation.VALIDATE_WORKFLOW,
        workflowId: request.workflow.workflowId,
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        validatedAt,
        metadata: {
          workflowId: request.workflow.workflowId,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          timestamp: validatedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown workflow validation error";
      throw new WorkflowValidationAgentException(request.workflow.workflowId, [
        errorMsg,
      ]);
    }
  }

  public async pauseWorkflow(
    request: WorkflowPauseRequest,
    context: IAgentExecutionContext,
  ): Promise<WorkflowPauseResult> {
    const pausedAt = new Date();

    try {
      // Use existing workflow engine to pause
      const paused = await this.components.workflowEngine.pause(
        request.executionId,
      );

      if (paused) {
        this.totalPauses++;
      }

      return {
        success: true,
        operation: WorkflowOperation.PAUSE_WORKFLOW,
        executionId: request.executionId,
        paused,
        pausedAt,
        metadata: {
          executionId: request.executionId,
          timestamp: pausedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown workflow pause error";
      throw new WorkflowControlException(
        request.executionId,
        "pause",
        errorMsg,
      );
    }
  }

  public async resumeWorkflow(
    request: WorkflowResumeRequest,
    context: IAgentExecutionContext,
  ): Promise<WorkflowResumeResult> {
    const resumedAt = new Date();

    try {
      // Use existing workflow engine to resume
      const resumed = await this.components.workflowEngine.resume(
        request.executionId,
      );

      if (resumed) {
        this.totalResumes++;
      }

      return {
        success: true,
        operation: WorkflowOperation.RESUME_WORKFLOW,
        executionId: request.executionId,
        resumed,
        resumedAt,
        metadata: {
          executionId: request.executionId,
          timestamp: resumedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown workflow resume error";
      throw new WorkflowControlException(
        request.executionId,
        "resume",
        errorMsg,
      );
    }
  }

  public async cancelWorkflow(
    request: WorkflowCancelRequest,
    context: IAgentExecutionContext,
  ): Promise<WorkflowCancelResult> {
    const cancelledAt = new Date();

    try {
      // Use existing workflow engine to cancel
      const cancelled = await this.components.workflowEngine.cancel(
        request.executionId,
      );

      if (cancelled) {
        this.totalCancellations++;
      }

      return {
        success: true,
        operation: WorkflowOperation.CANCEL_WORKFLOW,
        executionId: request.executionId,
        cancelled,
        cancelledAt,
        metadata: {
          executionId: request.executionId,
          timestamp: cancelledAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : "Unknown workflow cancel error";
      throw new WorkflowControlException(
        request.executionId,
        "cancel",
        errorMsg,
      );
    }
  }

  public async getWorkflowAgentHealth(): Promise<WorkflowAgentHealth> {
    try {
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.workflowEngine) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      return {
        workflowEngineAvailable: !!this.components.workflowEngine,
        status,
        totalWorkflows: this.totalExecutions,
        runningExecutions: 0, // Would need to track this from engine
        completedExecutions:
          this.successCounts[WorkflowOperation.EXECUTE_WORKFLOW] || 0,
        failedExecutions:
          this.errorCounts[WorkflowOperation.EXECUTE_WORKFLOW] || 0,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          totalValidations: this.totalValidations,
          validationSuccessRate:
            this.totalValidations > 0
              ? this.validWorkflows / this.totalValidations
              : 0,
          totalPauses: this.totalPauses,
          totalResumes: this.totalResumes,
          totalCancellations: this.totalCancellations,
        },
      };
    } catch (error) {
      const errorMsg = `Failed to get workflow agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        workflowEngineAvailable: false,
        status: "unhealthy",
        totalWorkflows: 0,
        runningExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg },
      };
    }
  }

  public getMetrics(): WorkflowAgentMetrics {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const successRate =
      totalOperations > 0 ? totalSuccesses / totalOperations : 0;

    // Calculate average latencies
    const averageLatencies: Record<WorkflowOperation, number> = {} as Record<
      WorkflowOperation,
      number
    >;
    Object.keys(this.latencies).forEach((op) => {
      const operation = op as WorkflowOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;
    });

    const successfulExecutions =
      this.successCounts[WorkflowOperation.EXECUTE_WORKFLOW] || 0;
    const failedExecutions =
      this.errorCounts[WorkflowOperation.EXECUTE_WORKFLOW] || 0;

    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      workflowStats: {
        totalExecutions: this.totalExecutions,
        currentlyRunning: 0, // Would need to track this from engine
        averageExecutionTime:
          averageLatencies[WorkflowOperation.EXECUTE_WORKFLOW] || 0,
        successfulExecutions,
        failedExecutions,
        cancelledExecutions: this.totalCancellations,
      },
      operationStats: {
        totalValidations: this.totalValidations,
        validWorkflows: this.validWorkflows,
        invalidWorkflows: this.invalidWorkflows,
        totalPauses: this.totalPauses,
        totalResumes: this.totalResumes,
        totalCancellations: this.totalCancellations,
      },
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): WorkflowOperationRequest {
    if (!input || typeof input !== "object") {
      throw new InvalidWorkflowOperationException(
        "unknown",
        "Input must be an object",
      );
    }

    const request = input as Record<string, unknown>;

    if (!request.operation || typeof request.operation !== "string") {
      throw new InvalidWorkflowOperationException(
        "unknown",
        "Operation is required and must be a string",
      );
    }

    if (
      !Object.values(WorkflowOperation).includes(
        request.operation as WorkflowOperation,
      )
    ) {
      throw new InvalidWorkflowOperationException(
        request.operation as string,
        "Unsupported operation",
      );
    }

    // Validate operation-specific requirements
    const operation = request.operation as WorkflowOperation;

    if (operation === WorkflowOperation.EXECUTE_WORKFLOW) {
      if (!request.workflowId || typeof request.workflowId !== "string") {
        throw new InvalidWorkflowOperationException(
          operation,
          "Workflow ID is required for execute operation",
        );
      }
      if (request.input === undefined) {
        throw new InvalidWorkflowOperationException(
          operation,
          "Input is required for execute operation",
        );
      }
      if (!request.context || typeof request.context !== "object") {
        throw new InvalidWorkflowOperationException(
          operation,
          "Context is required for execute operation",
        );
      }
    }

    if (operation === WorkflowOperation.VALIDATE_WORKFLOW) {
      if (!request.workflow || typeof request.workflow !== "object") {
        throw new InvalidWorkflowOperationException(
          operation,
          "Workflow is required for validate operation",
        );
      }
    }

    if (
      [
        WorkflowOperation.PAUSE_WORKFLOW,
        WorkflowOperation.RESUME_WORKFLOW,
        WorkflowOperation.CANCEL_WORKFLOW,
      ].includes(operation)
    ) {
      if (!request.executionId || typeof request.executionId !== "string") {
        throw new InvalidWorkflowOperationException(
          operation,
          "Execution ID is required for control operations",
        );
      }
    }

    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request,
    } as WorkflowOperationRequest;
  }

  private initializeMetrics(): void {
    Object.values(WorkflowOperation).forEach((operation) => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: WorkflowOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(
    operation: WorkflowOperation,
    duration: number,
  ): void {
    this.successCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private recordOperationError(
    operation: WorkflowOperation,
    duration: number,
  ): void {
    this.errorCounts[operation]++;
    this.latencies[operation].push(duration);

    // Keep only last 100 latency measurements per operation
    if (this.latencies[operation].length > 100) {
      this.latencies[operation].shift();
    }
  }

  private calculateSuccessRate(): number {
    const totalOperations = Object.values(this.operationCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const totalSuccesses = Object.values(this.successCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    return totalOperations > 0 ? totalSuccesses / totalOperations : 0;
  }
}
