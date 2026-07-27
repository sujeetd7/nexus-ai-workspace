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
  PlannerOperation,
  PlannerOperationRequest,
  PlannerPlanRequest,
  PlannerReplanRequest,
  PlannerValidateRequest,
  PlannerEstimateRequest,
  PlannerOperationResult,
  PlannerPlanResult,
  PlannerReplanResult,
  PlannerValidateResult,
  PlannerEstimateResult,
  PlannerAgentHealth,
  PlannerAgentMetrics,
} from "./planner-agent.types";
import {
  PlannerAgentException,
  InvalidPlannerOperationException,
  PlanningException,
  PlanValidationException,
  PlanEstimationException,
  PlannerUnavailableException,
  InvalidPlanException,
  ReplanningException,
  InvalidPlannerContextException,
} from "./planner-agent.exceptions";
import {
  IAgentPlanner,
  AgentPlanner,
  PlanningRequest,
} from "../../planner/agent-planner";
import { AgentPlan, ExecutionMode } from "../../planner/agent-plan";
import { AgentTask, TaskState, TaskType } from "../../planner/agent-task";

export interface PlannerAgentComponents {
  planner: IAgentPlanner;
}

export class PlannerAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];

  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();

  // Planner components
  private readonly components: PlannerAgentComponents;

  // Metrics
  private readonly operationCounts: Record<PlannerOperation, number> =
    {} as Record<PlannerOperation, number>;
  private readonly successCounts: Record<PlannerOperation, number> =
    {} as Record<PlannerOperation, number>;
  private readonly errorCounts: Record<PlannerOperation, number> = {} as Record<
    PlannerOperation,
    number
  >;
  private readonly latencies: Record<PlannerOperation, number[]> = {} as Record<
    PlannerOperation,
    number[]
  >;
  private readonly activePlans: Map<string, AgentPlan> = new Map();

  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  // Plan tracking
  private totalPlansCreated = 0;
  private totalReplans = 0;
  private totalValidations = 0;
  private validPlans = 0;
  private invalidPlans = 0;

  constructor(components: PlannerAgentComponents) {
    this.metadata = {
      id: "planner-agent",
      name: "Planner Agent",
      description:
        "Built-in agent for planning operations using the existing Agent Planner infrastructure",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["planning", "builtin", "coordination"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capabilities = [
      {
        id: "plan-creation",
        name: "Plan Creation",
        description: "Create execution plans for agents with task breakdown",
        inputSchema: { operation: "string", agentId: "string", tasks: "array" },
        outputSchema: { success: "boolean", plan: "object" },
        parameters: { maxConcurrency: 5, timeout: 300000 },
        dependencies: [],
      },
      {
        id: "plan-validation",
        name: "Plan Validation",
        description: "Validate execution plans for correctness and feasibility",
        inputSchema: { operation: "string", plan: "object" },
        outputSchema: { success: "boolean", valid: "boolean", errors: "array" },
        parameters: { strict: false },
        dependencies: [],
      },
      {
        id: "plan-estimation",
        name: "Plan Estimation",
        description:
          "Estimate execution time and resource requirements for plans",
        inputSchema: { operation: "string", plan: "object" },
        outputSchema: { success: "boolean", estimatedDuration: "number" },
        parameters: { includeTaskBreakdown: false },
        dependencies: [],
      },
      {
        id: "plan-replanning",
        name: "Plan Replanning",
        description: "Modify and update existing plans with new requirements",
        inputSchema: {
          operation: "string",
          existingPlan: "object",
          modifications: "object",
        },
        outputSchema: { success: "boolean", plan: "object" },
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
      if (!this.components.planner) {
        throw new PlannerUnavailableException();
      }

      this.agentStatus = AgentStatus.IDLE;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize planner agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new PlannerAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;

      // Cleanup resources if needed
      this.activePlans.clear();

      this.agentStatus = AgentStatus.STOPPED;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown planner agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new PlannerAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      // Determine health status
      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.planner) {
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
          totalPlans: this.totalPlansCreated,
          activePlans: this.activePlans.size,
          totalOperations: Object.values(this.operationCounts).reduce(
            (sum, count) => sum + count,
            0,
          ),
          successRate: this.calculateSuccessRate(),
        },
      };

      return this.agentHealth;
    } catch (error) {
      const errorMsg = `Failed to get planner agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
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
      let result: PlannerOperationResult;

      switch (request.operation) {
        case PlannerOperation.PLAN:
          result = await this.createPlan(
            request as PlannerPlanRequest,
            context,
          );
          break;
        case PlannerOperation.REPLAN:
          result = await this.replan(request as PlannerReplanRequest, context);
          break;
        case PlannerOperation.VALIDATE:
          result = await this.validatePlan(
            request as PlannerValidateRequest,
            context,
          );
          break;
        case PlannerOperation.ESTIMATE:
          result = await this.estimatePlan(
            request as PlannerEstimateRequest,
            context,
          );
          break;
        default:
          throw new InvalidPlannerOperationException(
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
          input.operation as PlannerOperation,
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

  // Individual planner operations
  public async createPlan(
    request: PlannerPlanRequest,
    context: IAgentExecutionContext,
  ): Promise<PlannerPlanResult> {
    const createdAt = new Date();

    try {
      // Build planning request for the existing planner
      const planningRequest: PlanningRequest = {
        agentId: request.agentId,
        workspaceId: request.workspaceId,
        requestId: context.requestId,
        traceId: context.traceId,
        name: request.name,
        description: request.description,
        priority: request.priority,
        tasks: request.tasks,
        executionMode: request.executionMode,
        maxConcurrency: request.maxConcurrency,
        timeoutMs: request.timeoutMs,
        metadata: {
          ...context.metadata,
          ...request.metadata,
        },
      };

      // Use existing planner to create plan
      const plan = await this.components.planner.createPlan(planningRequest);

      // Track active plan
      this.activePlans.set(plan.planId, plan);
      this.totalPlansCreated++;

      // Estimate duration using existing planner
      const estimatedDuration = await this.components.planner.estimate(plan);

      return {
        success: true,
        operation: PlannerOperation.PLAN,
        plan,
        planId: plan.planId,
        taskCount: plan.tasks.length,
        estimatedDuration,
        createdAt,
        metadata: {
          agentId: request.agentId,
          workspaceId: request.workspaceId,
          executionMode: plan.executionMode,
          priority: plan.priority,
          timestamp: createdAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown planning error";
      throw new PlanningException(request.agentId, errorMsg);
    }
  }

  public async replan(
    request: PlannerReplanRequest,
    context: IAgentExecutionContext,
  ): Promise<PlannerReplanResult> {
    const replanedAt = new Date();

    try {
      const originalPlan = request.existingPlan;
      const originalPlanId = originalPlan.planId;

      // Apply modifications to create new plan
      let modifiedTasks = [...originalPlan.tasks];
      let changesApplied = {
        tasksAdded: 0,
        tasksRemoved: 0,
        tasksUpdated: 0,
        modeChanged: false,
        priorityChanged: false,
      };

      if (request.modifications) {
        const mods = request.modifications;

        // Add tasks
        if (mods.addTasks) {
          for (const taskTemplate of mods.addTasks) {
            const newTask = {
              taskId: randomUUID(),
              agentId: originalPlan.agentId,
              workspaceId: originalPlan.workspaceId,
              requestId: originalPlan.requestId,
              traceId: originalPlan.traceId,
              name: taskTemplate.name || "Unnamed Task",
              description: taskTemplate.description || "",
              type: taskTemplate.type || TaskType.EXECUTION,
              state: TaskState.PENDING,
              priority: taskTemplate.priority || originalPlan.priority,
              input: taskTemplate.input,
              output: undefined,
              error: undefined,
              dependencies: taskTemplate.dependencies || [],
              timeoutMs: taskTemplate.timeoutMs || 30000,
              retryStrategy: {
                maxAttempts: 3,
                backoffMs: 1000,
                backoffMultiplier: 2,
                maxBackoffMs: 30000,
              },
              metadata: taskTemplate.metadata || {},
              metrics: {
                createdAt: new Date(),
                attempts: 0,
              },
            } as AgentTask;

            modifiedTasks.push(newTask);
            changesApplied.tasksAdded++;
          }
        }

        // Remove tasks
        if (mods.removeTasks) {
          modifiedTasks = modifiedTasks.filter(
            (task) => !mods.removeTasks!.includes(task.taskId),
          );
          changesApplied.tasksRemoved = mods.removeTasks.length;
        }

        // Update tasks
        if (mods.updateTasks) {
          for (const update of mods.updateTasks) {
            const taskIndex = modifiedTasks.findIndex(
              (task) => task.taskId === update.taskId,
            );
            if (taskIndex >= 0) {
              modifiedTasks[taskIndex] = {
                ...modifiedTasks[taskIndex],
                ...update.updates,
              };
              changesApplied.tasksUpdated++;
            }
          }
        }
      }

      // Create new plan request
      const newPlanRequest: PlanningRequest = {
        agentId: originalPlan.agentId,
        workspaceId: originalPlan.workspaceId,
        requestId: context.requestId,
        traceId: context.traceId,
        name: `${originalPlan.name} (Replanned)`,
        description: `Replanned version of ${originalPlan.name}${request.reason ? ` - ${request.reason}` : ""}`,
        priority:
          request.modifications?.changePriority || originalPlan.priority,
        tasks: modifiedTasks,
        executionMode:
          request.modifications?.changeMode || originalPlan.executionMode,
        maxConcurrency: originalPlan.maxConcurrency,
        timeoutMs: originalPlan.timeoutMs,
        metadata: {
          ...originalPlan.metadata,
          replanned: true,
          originalPlanId,
          replanReason: request.reason,
        },
      };

      if (request.modifications?.changeMode) {
        changesApplied.modeChanged = true;
      }
      if (request.modifications?.changePriority) {
        changesApplied.priorityChanged = true;
      }

      // Create new plan using existing planner
      const newPlan = await this.components.planner.createPlan(newPlanRequest);

      // Track new plan and update metrics
      this.activePlans.set(newPlan.planId, newPlan);
      this.activePlans.delete(originalPlanId);
      this.totalReplans++;

      // Estimate new duration
      const newEstimatedDuration =
        await this.components.planner.estimate(newPlan);

      return {
        success: true,
        operation: PlannerOperation.REPLAN,
        plan: newPlan,
        planId: newPlan.planId,
        originalPlanId,
        changesApplied,
        newEstimatedDuration,
        replanedAt,
        metadata: {
          reason: request.reason,
          modificationsApplied: Object.keys(request.modifications || {}),
          timestamp: replanedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown replanning error";
      throw new ReplanningException(request.existingPlan.planId, errorMsg);
    }
  }

  public async validatePlan(
    request: PlannerValidateRequest,
    context: IAgentExecutionContext,
  ): Promise<PlannerValidateResult> {
    const validatedAt = new Date();

    try {
      // Use existing planner to validate plan
      const validationResult = await this.components.planner.validatePlan(
        request.plan,
      );

      this.totalValidations++;
      if (validationResult.valid) {
        this.validPlans++;
      } else {
        this.invalidPlans++;
      }

      return {
        success: true,
        operation: PlannerOperation.VALIDATE,
        planId: request.plan.planId,
        valid: validationResult.valid,
        validationResult,
        validatedAt,
        metadata: {
          strict: request.strict,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length,
          timestamp: validatedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown validation error";
      throw new PlanValidationException(request.plan.planId, [errorMsg]);
    }
  }

  public async estimatePlan(
    request: PlannerEstimateRequest,
    context: IAgentExecutionContext,
  ): Promise<PlannerEstimateResult> {
    const estimatedAt = new Date();

    try {
      // Use existing planner to estimate plan
      const estimatedDurationMs = await this.components.planner.estimate(
        request.plan,
      );

      // Build task breakdown if requested
      let taskBreakdown: PlannerEstimateResult["taskBreakdown"];
      if (request.includeTaskBreakdown) {
        taskBreakdown = request.plan.tasks.map((task) => ({
          taskId: task.taskId,
          taskName: task.name,
          estimatedDuration: task.timeoutMs || 30000, // Simplified estimation
          dependencies: task.dependencies.map((dep) =>
            typeof dep === "string" ? dep : dep.taskId,
          ),
        }));
      }

      return {
        success: true,
        operation: PlannerOperation.ESTIMATE,
        planId: request.plan.planId,
        estimatedDurationMs,
        taskBreakdown,
        estimatedAt,
        metadata: {
          taskCount: request.plan.tasks.length,
          executionMode: request.plan.executionMode,
          includeTaskBreakdown: request.includeTaskBreakdown,
          timestamp: estimatedAt,
        },
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown estimation error";
      throw new PlanEstimationException(request.plan.planId, errorMsg);
    }
  }

  public async getPlannerAgentHealth(): Promise<PlannerAgentHealth> {
    try {
      const totalPlans = this.totalPlansCreated;
      const averagePlanComplexity =
        totalPlans > 0
          ? Array.from(this.activePlans.values()).reduce(
              (sum, plan) => sum + plan.tasks.length,
              0,
            ) / this.activePlans.size || 0
          : 0;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";

      if (this.errors.length > 0 || !this.components.planner) {
        status = "unhealthy";
      } else if (this.warnings.length > 0) {
        status = "degraded";
      }

      return {
        plannerAvailable: !!this.components.planner,
        status,
        activePlans: this.activePlans.size,
        totalPlansCreated: totalPlans,
        averagePlanComplexity,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          totalReplans: this.totalReplans,
          totalValidations: this.totalValidations,
          validationSuccessRate:
            this.totalValidations > 0
              ? this.validPlans / this.totalValidations
              : 0,
        },
      };
    } catch (error) {
      const errorMsg = `Failed to get planner agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        plannerAvailable: false,
        status: "unhealthy",
        activePlans: 0,
        totalPlansCreated: 0,
        averagePlanComplexity: 0,
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg },
      };
    }
  }

  public getMetrics(): PlannerAgentMetrics {
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
    const averageLatencies: Record<PlannerOperation, number> = {} as Record<
      PlannerOperation,
      number
    >;
    Object.keys(this.latencies).forEach((op) => {
      const operation = op as PlannerOperation;
      const times = this.latencies[operation];
      averageLatencies[operation] =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;
    });

    // Calculate plan statistics
    const activePlansArray = Array.from(this.activePlans.values());
    const averageTasksPerPlan =
      activePlansArray.length > 0
        ? activePlansArray.reduce((sum, plan) => sum + plan.tasks.length, 0) /
          activePlansArray.length
        : 0;

    const plansByMode: Record<ExecutionMode, number> = {
      [ExecutionMode.SEQUENTIAL]: 0,
      [ExecutionMode.PARALLEL]: 0,
      [ExecutionMode.MIXED]: 0,
    };

    const plansByPriority: Record<AgentPriority, number> = {
      [AgentPriority.LOW]: 0,
      [AgentPriority.NORMAL]: 0,
      [AgentPriority.HIGH]: 0,
      [AgentPriority.CRITICAL]: 0,
    };

    activePlansArray.forEach((plan) => {
      plansByMode[plan.executionMode]++;
      plansByPriority[plan.priority]++;
    });

    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageLatencies,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      planningStats: {
        totalPlansCreated: this.totalPlansCreated,
        totalReplans: this.totalReplans,
        averageTasksPerPlan,
        averagePlanDuration: averageLatencies[PlannerOperation.ESTIMATE] || 0,
        plansByMode,
        plansByPriority,
      },
      validationStats: {
        totalValidations: this.totalValidations,
        validPlans: this.validPlans,
        invalidPlans: this.invalidPlans,
        averageValidationTime: averageLatencies[PlannerOperation.VALIDATE] || 0,
        commonErrors: {}, // Would need to track this separately
      },
      estimationAccuracy: {
        totalEstimates: this.operationCounts[PlannerOperation.ESTIMATE] || 0,
        averageEstimation: averageLatencies[PlannerOperation.ESTIMATE] || 0,
        estimationDistribution: {
          under1Min: 0, // Would need to track these separately
          under5Min: 0,
          under15Min: 0,
          under1Hour: 0,
          over1Hour: 0,
        },
      },
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): PlannerOperationRequest {
    if (!input || typeof input !== "object") {
      throw new InvalidPlannerOperationException(
        "unknown",
        "Input must be an object",
      );
    }

    const request = input as Record<string, unknown>;

    if (!request.operation || typeof request.operation !== "string") {
      throw new InvalidPlannerOperationException(
        "unknown",
        "Operation is required and must be a string",
      );
    }

    if (
      !Object.values(PlannerOperation).includes(
        request.operation as PlannerOperation,
      )
    ) {
      throw new InvalidPlannerOperationException(
        request.operation as string,
        "Unsupported operation",
      );
    }

    // Validate operation-specific requirements
    const operation = request.operation as PlannerOperation;

    if (operation === PlannerOperation.PLAN) {
      if (!request.agentId || typeof request.agentId !== "string") {
        throw new InvalidPlannerOperationException(
          operation,
          "Agent ID is required for plan operation",
        );
      }
      if (!request.workspaceId || typeof request.workspaceId !== "string") {
        throw new InvalidPlannerOperationException(
          operation,
          "Workspace ID is required for plan operation",
        );
      }
      if (!request.name || typeof request.name !== "string") {
        throw new InvalidPlannerOperationException(
          operation,
          "Name is required for plan operation",
        );
      }
      if (!request.tasks || !Array.isArray(request.tasks)) {
        throw new InvalidPlannerOperationException(
          operation,
          "Tasks array is required for plan operation",
        );
      }
    }

    if (operation === PlannerOperation.REPLAN) {
      if (!request.existingPlan || typeof request.existingPlan !== "object") {
        throw new InvalidPlannerOperationException(
          operation,
          "Existing plan is required for replan operation",
        );
      }
    }

    if (
      operation === PlannerOperation.VALIDATE ||
      operation === PlannerOperation.ESTIMATE
    ) {
      if (!request.plan || typeof request.plan !== "object") {
        throw new InvalidPlannerOperationException(
          operation,
          "Plan is required for validate/estimate operations",
        );
      }
    }

    return {
      operation,
      metadata: (request.metadata as Record<string, unknown>) || {},
      ...request,
    } as PlannerOperationRequest;
  }

  private initializeMetrics(): void {
    Object.values(PlannerOperation).forEach((operation) => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.latencies[operation] = [];
    });
  }

  private recordOperationAttempt(operation: PlannerOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(
    operation: PlannerOperation,
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
    operation: PlannerOperation,
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
