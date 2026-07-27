import { randomUUID } from "crypto";
import {
  OrchestratorState,
  ExecutionType,
  OrchestratorExecutionStatus,
  OrchestratorExecutionContext,
  AgentExecutionRequest,
  MultiAgentExecutionRequest,
  WorkflowExecutionRequest,
  PlanExecutionRequest,
  OrchestratorExecution,
  OrchestratorHealth,
  OrchestratorMetrics,
} from "./orchestrator.types";
import {
  OrchestratorException,
  OrchestratorNotReadyException,
  OrchestratorExecutionNotFoundException,
  InvalidExecutionRequestException,
  AgentNotAvailableException,
  ComponentUnavailableException,
} from "./orchestrator.exceptions";

// Import existing components
import { IAgentRegistry } from "../interfaces";
import { IAgentLifecycleManager } from "../lifecycle";
import { IAgentScheduler } from "../scheduler";
import { IAgentPlanner } from "../planner";
import { IWorkflowEngine } from "../workflow";
import { IAgentRuntime } from "../runtime";
import { ICommunicationManager } from "../communication";
import { IAgentMemory } from "../memory";
import { ExecutionResult, AgentHealth } from "../types";

export interface IOrchestratorComponents {
  agentRegistry: IAgentRegistry;
  lifecycleManager: IAgentLifecycleManager;
  scheduler: IAgentScheduler;
  planner: IAgentPlanner;
  workflowEngine: IWorkflowEngine;
  agentRuntime: IAgentRuntime;
  communicationManager: ICommunicationManager;
  agentMemory: IAgentMemory;
}

export interface IAgentOrchestrator {
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  execute(request: AgentExecutionRequest): Promise<OrchestratorExecution>;
  executeWorkflow(
    request: WorkflowExecutionRequest,
  ): Promise<OrchestratorExecution>;
  executePlan(request: PlanExecutionRequest): Promise<OrchestratorExecution>;
  cancel(executionId: string): Promise<boolean>;
  health(): Promise<OrchestratorHealth>;
}

export class AgentOrchestrator implements IAgentOrchestrator {
  private state: OrchestratorState = OrchestratorState.STOPPED;
  private readonly executions: Map<string, OrchestratorExecution> = new Map();
  private readonly startTime: Date = new Date();
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];

  private totalExecutions = 0;
  private successfulExecutions = 0;
  private failedExecutions = 0;
  private totalExecutionTime = 0;

  constructor(private readonly components: IOrchestratorComponents) {}

  public async start(): Promise<void> {
    if (this.state === OrchestratorState.RUNNING) {
      return; // Already started
    }

    try {
      this.state = OrchestratorState.INITIALIZING;

      // Validate all components are available
      await this.validateComponents();

      // Start communication manager
      // Note: Communication manager doesn't have explicit start/stop methods
      // but we could initialize channels here if needed

      this.state = OrchestratorState.RUNNING;
    } catch (error) {
      this.state = OrchestratorState.ERROR;
      const errorMsg = `Failed to start orchestrator: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new OrchestratorException("start", errorMsg);
    }
  }

  public async stop(): Promise<void> {
    if (this.state === OrchestratorState.STOPPED) {
      return; // Already stopped
    }

    try {
      this.state = OrchestratorState.STOPPING;

      // Cancel all running executions
      const runningExecutions = Array.from(this.executions.values()).filter(
        (exec) => exec.status === OrchestratorExecutionStatus.RUNNING,
      );

      for (const execution of runningExecutions) {
        await this.cancel(execution.executionId);
      }

      // Pause scheduler
      await this.components.scheduler.pause();

      this.state = OrchestratorState.STOPPED;
    } catch (error) {
      this.state = OrchestratorState.ERROR;
      const errorMsg = `Failed to stop orchestrator: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new OrchestratorException("stop", errorMsg);
    }
  }

  public async pause(): Promise<void> {
    if (this.state !== OrchestratorState.RUNNING) {
      throw new OrchestratorNotReadyException(
        this.state,
        "Cannot pause orchestrator in current state",
      );
    }

    try {
      // Pause scheduler
      await this.components.scheduler.pause();

      // Pause running executions
      const runningExecutions = Array.from(this.executions.values()).filter(
        (exec) => exec.status === OrchestratorExecutionStatus.RUNNING,
      );

      for (const execution of runningExecutions) {
        execution.status = OrchestratorExecutionStatus.PAUSED;

        // Pause workflow executions if applicable
        if (execution.type === ExecutionType.WORKFLOW) {
          await this.components.workflowEngine.pause(execution.executionId);
        }
      }

      this.state = OrchestratorState.PAUSED;
    } catch (error) {
      const errorMsg = `Failed to pause orchestrator: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new OrchestratorException("pause", errorMsg);
    }
  }

  public async resume(): Promise<void> {
    if (this.state !== OrchestratorState.PAUSED) {
      throw new OrchestratorNotReadyException(
        this.state,
        "Cannot resume orchestrator in current state",
      );
    }

    try {
      // Resume scheduler
      await this.components.scheduler.resume();

      // Resume paused executions
      const pausedExecutions = Array.from(this.executions.values()).filter(
        (exec) => exec.status === OrchestratorExecutionStatus.PAUSED,
      );

      for (const execution of pausedExecutions) {
        execution.status = OrchestratorExecutionStatus.RUNNING;

        // Resume workflow executions if applicable
        if (execution.type === ExecutionType.WORKFLOW) {
          await this.components.workflowEngine.resume(execution.executionId);
        }
      }

      this.state = OrchestratorState.RUNNING;
    } catch (error) {
      const errorMsg = `Failed to resume orchestrator: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new OrchestratorException("resume", errorMsg);
    }
  }

  public async execute(
    request: AgentExecutionRequest,
  ): Promise<OrchestratorExecution> {
    this.ensureRunning();

    // Validate request
    const validation = this.validateAgentExecutionRequest(request);
    if (validation.length > 0) {
      throw new InvalidExecutionRequestException("agent", validation);
    }

    const execution = this.createExecution(ExecutionType.SINGLE_AGENT, request);

    try {
      execution.status = OrchestratorExecutionStatus.RUNNING;

      // Validate and initialize agent
      await this.validateAndInitializeAgent(request.agentId, request.context);

      // Load memory context
      const memoryContext = await this.loadMemoryContext(request.context);

      // Execute agent
      const result = await this.components.agentRuntime.executeAgent({
        agentId: request.agentId,
        input: request.input,
        context: {
          requestId: request.context.requestId,
          traceId: request.context.traceId,
          workspaceId: request.context.workspaceId,
          userId: request.context.userId,
          conversationId: request.context.conversationId,
          sessionId: request.context.executionId,
          startTime: new Date(),
          timeout: request.timeout,
          cancellationToken: request.context.cancellationToken,
          metadata: {
            ...request.context.metadata,
            memoryContext,
          },
        },
        timeout: request.timeout,
      });

      // Persist runtime state
      await this.persistRuntimeState(execution, result);

      // Publish completion event
      await this.publishCompletionEvent(execution, result);

      execution.status = OrchestratorExecutionStatus.COMPLETED;
      execution.result = result;
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, true);

      return execution;
    } catch (error) {
      execution.status = OrchestratorExecutionStatus.FAILED;
      execution.error =
        error instanceof Error ? error.message : "Unknown execution error";
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, false);

      throw error;
    }
  }

  public async executeWorkflow(
    request: WorkflowExecutionRequest,
  ): Promise<OrchestratorExecution> {
    this.ensureRunning();

    // Validate request
    const validation = this.validateWorkflowExecutionRequest(request);
    if (validation.length > 0) {
      throw new InvalidExecutionRequestException("workflow", validation);
    }

    const execution = this.createExecution(ExecutionType.WORKFLOW, request);

    try {
      execution.status = OrchestratorExecutionStatus.RUNNING;

      // Load memory context
      const memoryContext = await this.loadMemoryContext(request.context);

      // Execute workflow
      const workflowContext = {
        requestId: request.context.requestId,
        traceId: request.context.traceId,
        workspaceId: request.context.workspaceId,
        conversationId: request.context.conversationId,
        userId: request.context.userId,
        agentId: "orchestrator", // Orchestrator manages workflow
        executionId: request.context.executionId,
        metadata: {
          ...request.context.metadata,
          memoryContext,
        },
        startTime: new Date(),
        variables: request.variables || {},
      };

      const result = await this.components.workflowEngine.execute(
        request.workflowId,
        request.input,
        workflowContext,
      );

      // Extract involved agents from workflow execution
      execution.agentsInvolved = this.extractInvolvedAgents(result);

      // Persist runtime state
      await this.persistRuntimeState(execution, result);

      // Publish completion event
      await this.publishCompletionEvent(execution, result);

      execution.status = OrchestratorExecutionStatus.COMPLETED;
      execution.result = result;
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, true);

      return execution;
    } catch (error) {
      execution.status = OrchestratorExecutionStatus.FAILED;
      execution.error =
        error instanceof Error
          ? error.message
          : "Unknown workflow execution error";
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, false);

      throw error;
    }
  }

  public async executePlan(
    request: PlanExecutionRequest,
  ): Promise<OrchestratorExecution> {
    this.ensureRunning();

    // Validate request
    const validation = this.validatePlanExecutionRequest(request);
    if (validation.length > 0) {
      throw new InvalidExecutionRequestException("plan", validation);
    }

    const execution = this.createExecution(ExecutionType.PLAN, request);

    try {
      execution.status = OrchestratorExecutionStatus.RUNNING;

      // Get or create plan
      let plan = request.plan;
      if (!plan && request.planId) {
        // Load plan from planner (implementation would depend on planner having a registry)
        // For now, throw an error as plans should be provided directly
        throw new Error(
          "Plan loading by ID not implemented - provide plan directly",
        );
      }

      if (!plan) {
        throw new Error("No plan provided for execution");
      }

      // Load memory context
      const memoryContext = await this.loadMemoryContext(request.context);

      // Schedule plan tasks
      for (const task of plan.tasks) {
        await this.components.scheduler.schedule(task);
      }

      // Wait for plan completion (simplified implementation)
      // In a real implementation, this would involve more sophisticated tracking
      let completedTasks = 0;
      const totalTasks = plan.tasks.length;

      while (completedTasks < totalTasks) {
        // This is a simplified polling approach
        // In production, this would use event-driven completion tracking
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check task completion status
        // This is placeholder logic - real implementation would track actual task states
        completedTasks++;
      }

      execution.agentsInvolved = plan.tasks.map((task) => task.agentId);
      execution.stepCount = plan.tasks.length;

      // Persist runtime state
      await this.persistRuntimeState(execution, plan);

      // Publish completion event
      await this.publishCompletionEvent(execution, plan);

      execution.status = OrchestratorExecutionStatus.COMPLETED;
      execution.result = plan;
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, true);

      return execution;
    } catch (error) {
      execution.status = OrchestratorExecutionStatus.FAILED;
      execution.error =
        error instanceof Error ? error.message : "Unknown plan execution error";
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      this.updateMetrics(execution, false);

      throw error;
    }
  }

  public async cancel(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new OrchestratorExecutionNotFoundException(executionId);
    }

    if (
      execution.status !== OrchestratorExecutionStatus.RUNNING &&
      execution.status !== OrchestratorExecutionStatus.PAUSED
    ) {
      return false; // Already completed
    }

    try {
      execution.status = OrchestratorExecutionStatus.CANCELLED;
      execution.completedAt = new Date();
      execution.duration =
        execution.completedAt.getTime() - execution.startedAt.getTime();

      // Cancel based on execution type
      switch (execution.type) {
        case ExecutionType.SINGLE_AGENT:
          await this.components.agentRuntime.cancelExecution(executionId);
          break;

        case ExecutionType.WORKFLOW:
          await this.components.workflowEngine.cancel(executionId);
          break;

        case ExecutionType.PLAN:
          // Cancel scheduled tasks (simplified)
          for (const agentId of execution.agentsInvolved) {
            // This would need more sophisticated task tracking in real implementation
            console.log(`Cancelling tasks for agent: ${agentId}`);
          }
          break;
      }

      return true;
    } catch (error) {
      const errorMsg = `Failed to cancel execution ${executionId}: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new OrchestratorException("cancel", errorMsg);
    }
  }

  public async health(): Promise<OrchestratorHealth> {
    const uptime = Date.now() - this.startTime.getTime();

    // Get component health information
    let registeredAgents = 0;
    let runningAgents = 0;
    let queuedTasks = 0;
    let runningExecutions = 0;
    let runningWorkflows = 0;
    let memoryUsage = 0;

    try {
      const agents = await this.components.agentRegistry.list();
      registeredAgents = agents.length;

      // Count running agents (simplified - would need agent status tracking)
      runningAgents = agents.filter(
        (agent) => agent.status === "running",
      ).length;

      // Get queue sizes
      const queueSizes = await this.components.scheduler.queueSizes();
      queuedTasks =
        queueSizes.priority + queueSizes.execution + queueSizes.waiting;

      // Get running executions
      runningExecutions = Array.from(this.executions.values()).filter(
        (exec) => exec.status === OrchestratorExecutionStatus.RUNNING,
      ).length;

      // Get memory health
      const memoryHealth = await this.components.agentMemory.health();
      memoryUsage = memoryHealth.usedSize;
    } catch (error) {
      this.warnings.push(
        `Failed to collect health metrics: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Determine overall health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (this.state === OrchestratorState.ERROR || this.errors.length > 0) {
      status = "unhealthy";
    } else if (
      this.state !== OrchestratorState.RUNNING ||
      this.warnings.length > 0
    ) {
      status = "degraded";
    }

    const averageExecutionTime =
      this.totalExecutions > 0
        ? this.totalExecutionTime / this.totalExecutions
        : 0;

    return {
      status,
      state: this.state,
      uptime,
      registeredAgents,
      runningAgents,
      queuedTasks,
      runningExecutions,
      runningWorkflows,
      memoryUsage,
      activeConnections: 0, // Placeholder
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      averageExecutionTime,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastActivity: new Date(),
    };
  }

  private async validateComponents(): Promise<void> {
    const components = [
      { name: "agentRegistry", component: this.components.agentRegistry },
      { name: "lifecycleManager", component: this.components.lifecycleManager },
      { name: "scheduler", component: this.components.scheduler },
      { name: "planner", component: this.components.planner },
      { name: "workflowEngine", component: this.components.workflowEngine },
      { name: "agentRuntime", component: this.components.agentRuntime },
      {
        name: "communicationManager",
        component: this.components.communicationManager,
      },
      { name: "agentMemory", component: this.components.agentMemory },
    ];

    for (const { name, component } of components) {
      if (!component) {
        throw new ComponentUnavailableException(name, "Component not provided");
      }
    }
  }

  private ensureRunning(): void {
    if (this.state !== OrchestratorState.RUNNING) {
      throw new OrchestratorNotReadyException(this.state);
    }
  }

  private createExecution(
    type: ExecutionType,
    request: unknown,
  ): OrchestratorExecution {
    const executionId = randomUUID();
    const context = this.extractContext(request);

    const execution: OrchestratorExecution = {
      executionId,
      type,
      status: OrchestratorExecutionStatus.PENDING,
      context,
      request: request as
        | AgentExecutionRequest
        | MultiAgentExecutionRequest
        | WorkflowExecutionRequest
        | PlanExecutionRequest,
      startedAt: new Date(),
      agentsInvolved: [],
      memoryUsage: 0,
      stepCount: 0,
      metadata: {},
    };

    this.executions.set(executionId, execution);
    return execution;
  }

  private extractContext(request: unknown): OrchestratorExecutionContext {
    const req = request as any;
    return req.context as OrchestratorExecutionContext;
  }

  private validateAgentExecutionRequest(
    request: AgentExecutionRequest,
  ): string[] {
    const errors: string[] = [];

    if (!request.agentId) {
      errors.push("Agent ID is required");
    }

    if (!request.context) {
      errors.push("Execution context is required");
    }

    if (request.context && !request.context.requestId) {
      errors.push("Request ID is required in context");
    }

    return errors;
  }

  private validateWorkflowExecutionRequest(
    request: WorkflowExecutionRequest,
  ): string[] {
    const errors: string[] = [];

    if (!request.workflowId) {
      errors.push("Workflow ID is required");
    }

    if (!request.context) {
      errors.push("Execution context is required");
    }

    return errors;
  }

  private validatePlanExecutionRequest(
    request: PlanExecutionRequest,
  ): string[] {
    const errors: string[] = [];

    if (!request.planId && !request.plan) {
      errors.push("Either plan ID or plan object is required");
    }

    if (!request.context) {
      errors.push("Execution context is required");
    }

    return errors;
  }

  private async validateAndInitializeAgent(
    agentId: string,
    context: OrchestratorExecutionContext,
  ): Promise<void> {
    // Check if agent exists
    const agent = await this.components.agentRegistry.find(agentId);
    if (!agent) {
      throw new AgentNotAvailableException(
        agentId,
        "Agent not found in registry",
      );
    }

    // Check agent health
    const health = await agent.getHealth();
    if (health.status === "unhealthy") {
      throw new AgentNotAvailableException(
        agentId,
        `Agent unhealthy: ${health.errors.join(", ")}`,
      );
    }

    // Initialize agent if needed
    try {
      await this.components.lifecycleManager.initialize(agentId);
    } catch (error) {
      throw new AgentNotAvailableException(
        agentId,
        `Failed to initialize: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async loadMemoryContext(
    context: OrchestratorExecutionContext,
  ): Promise<unknown> {
    try {
      // Load memory context based on workspace and conversation
      const memoryContext = {
        requestId: context.requestId,
        traceId: context.traceId,
        workspaceId: context.workspaceId,
        userId: context.userId,
        conversationId: context.conversationId,
        agentId: "orchestrator",
        executionId: context.executionId,
        metadata: context.metadata,
      };

      // This would typically load conversation history, workspace state, etc.
      return await this.components.agentMemory.load("context", memoryContext);
    } catch (error) {
      this.warnings.push(
        `Failed to load memory context: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  private async persistRuntimeState(
    execution: OrchestratorExecution,
    result: unknown,
  ): Promise<void> {
    try {
      const memoryContext = {
        requestId: execution.context.requestId,
        traceId: execution.context.traceId,
        workspaceId: execution.context.workspaceId,
        userId: execution.context.userId,
        conversationId: execution.context.conversationId,
        agentId: "orchestrator",
        executionId: execution.context.executionId,
        metadata: execution.context.metadata,
      };

      await this.components.agentMemory.save(
        `execution_${execution.executionId}`,
        {
          execution,
          result,
          persistedAt: new Date(),
        },
        memoryContext,
      );
    } catch (error) {
      this.warnings.push(
        `Failed to persist runtime state: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private async publishCompletionEvent(
    execution: OrchestratorExecution,
    result: unknown,
  ): Promise<void> {
    try {
      // Publish completion event through communication manager
      const message = {
        messageId: randomUUID(),
        senderAgentId: "orchestrator",
        workspaceId: execution.context.workspaceId,
        requestId: execution.context.requestId,
        traceId: execution.context.traceId,
        timestamp: new Date(),
        priority: "normal" as any,
        type: "notification" as any,
        status: "sent" as any,
        payload: {
          event: "execution_completed",
          executionId: execution.executionId,
          type: execution.type,
          status: execution.status,
          result: result,
        },
        metadata: {
          source: "orchestrator",
          eventType: "execution_completion",
        },
      };

      // Get the bus from communication manager and broadcast
      const bus = (this.components.communicationManager as any).getBus?.();
      if (bus) {
        await bus.broadcast(message);
      }
    } catch (error) {
      this.warnings.push(
        `Failed to publish completion event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private extractInvolvedAgents(workflowResult: unknown): string[] {
    // Extract agent IDs from workflow execution result
    // This is a simplified implementation
    return [];
  }

  private updateMetrics(
    execution: OrchestratorExecution,
    success: boolean,
  ): void {
    this.totalExecutions++;

    if (success) {
      this.successfulExecutions++;
    } else {
      this.failedExecutions++;
    }

    if (execution.duration) {
      this.totalExecutionTime += execution.duration;
    }
  }
}
