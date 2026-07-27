import { randomUUID } from "crypto";
import {
  CoordinationStrategy,
  CoordinationStatus,
  VotingMethod,
  AgentAssignment,
  CoordinationTask,
  CoordinationContext,
  CoordinationRequest,
  CoordinationResult,
  HandoffRequest,
  HandoffResult,
  BroadcastRequest,
  BroadcastResult,
  CoordinatorHealth,
} from "./coordinator.types";
import {
  CoordinatorException,
  CoordinationNotFoundException,
  InvalidCoordinationException,
  CoordinationTimeoutException,
  CoordinationCancelledException,
  AgentNotAvailableForCoordinationException,
  InsufficientAgentsException,
  HandoffException,
  BroadcastException,
  QuorumNotReachedException,
  VotingException,
} from "./coordinator.exceptions";
import { IAgentRegistry } from "../interfaces";
import { IAgentRuntime } from "../runtime";
import { ICommunicationManager } from "../communication";
import { ExecutionResult } from "../types";

export interface ICoordinatorComponents {
  agentRegistry: IAgentRegistry;
  agentRuntime: IAgentRuntime;
  communicationManager: ICommunicationManager;
}

export interface IAgentCoordinator {
  assign(request: CoordinationRequest): Promise<CoordinationResult>;
  delegate(
    agentId: string,
    task: unknown,
    context: CoordinationContext,
  ): Promise<ExecutionResult>;
  handoff(request: HandoffRequest): Promise<HandoffResult>;
  broadcast(request: BroadcastRequest): Promise<BroadcastResult>;
  collect(coordinationId: string): Promise<CoordinationResult>;
  timeout(coordinationId: string): Promise<boolean>;
  cancel(coordinationId: string): Promise<boolean>;
  health(): Promise<CoordinatorHealth>;
}

export class AgentCoordinator implements IAgentCoordinator {
  private readonly coordinations: Map<string, CoordinationTask> = new Map();
  private readonly startTime: Date = new Date();
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];

  private totalCoordinations = 0;
  private successfulCoordinations = 0;
  private failedCoordinations = 0;
  private totalCoordinationTime = 0;

  constructor(private readonly components: ICoordinatorComponents) {}

  public async assign(
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    // Validate request
    const validation = this.validateCoordinationRequest(request);
    if (validation.length > 0) {
      throw new InvalidCoordinationException(
        request.context.coordinationId,
        validation,
      );
    }

    const coordinationId = request.context.coordinationId || randomUUID();
    const taskId = randomUUID();

    try {
      // Check agent availability
      await this.validateAgentAvailability(request.agentIds);

      // Create assignments
      const assignments = await this.createAssignments(request, taskId);

      // Create coordination task
      const task: CoordinationTask = {
        taskId,
        coordinationId,
        strategy: request.strategy,
        assignments,
        quorumSize: request.quorumSize,
        votingMethod: request.votingMethod,
        weightThreshold: request.weightThreshold,
        maxParallelism: request.maxParallelism,
        status: CoordinationStatus.ASSIGNED,
        startedAt: new Date(),
        results: {},
        timeoutMs: request.timeoutMs,
        cancellationToken: request.context.cancellationToken,
        retryAttempts: request.retryAttempts || 0,
        metadata: request.metadata,
      };

      this.coordinations.set(coordinationId, task);
      this.totalCoordinations++;

      // Execute coordination based on strategy
      const result = await this.executeCoordination(task, request);

      this.successfulCoordinations++;
      return result;
    } catch (error) {
      this.failedCoordinations++;

      const errorMsg =
        error instanceof Error ? error.message : "Unknown coordination error";
      this.errors.push(`Coordination ${coordinationId} failed: ${errorMsg}`);

      throw error;
    } finally {
      // Clean up coordination task
      this.coordinations.delete(coordinationId);
    }
  }

  public async delegate(
    agentId: string,
    task: unknown,
    context: CoordinationContext,
  ): Promise<ExecutionResult> {
    try {
      // Validate agent availability
      const agent = await this.components.agentRegistry.find(agentId);
      if (!agent) {
        throw new AgentNotAvailableForCoordinationException(
          agentId,
          "Agent not found",
        );
      }

      const health = await agent.getHealth();
      if (health.status === "unhealthy") {
        throw new AgentNotAvailableForCoordinationException(
          agentId,
          `Agent unhealthy: ${health.errors.join(", ")}`,
        );
      }

      // Execute task with agent runtime
      const result = await this.components.agentRuntime.executeAgent({
        agentId,
        input: task,
        context: {
          requestId: context.requestId,
          traceId: context.traceId,
          workspaceId: context.workspaceId,
          userId: context.userId,
          conversationId: context.conversationId,
          sessionId: context.executionId,
          startTime: context.startTime,
          timeout: context.timeout,
          cancellationToken: context.cancellationToken,
          metadata: context.metadata,
        },
        timeout: context.timeout,
      });

      return result;
    } catch (error) {
      const errorMsg = `Failed to delegate task to agent '${agentId}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new CoordinatorException(
        "delegate",
        context.coordinationId,
        errorMsg,
      );
    }
  }

  public async handoff(request: HandoffRequest): Promise<HandoffResult> {
    const handoffId = randomUUID();

    try {
      // Validate both agents
      const fromAgent = await this.components.agentRegistry.find(
        request.fromAgentId,
      );
      const toAgent = await this.components.agentRegistry.find(
        request.toAgentId,
      );

      if (!fromAgent) {
        throw new HandoffException(
          request.fromAgentId,
          request.toAgentId,
          "Source agent not found",
        );
      }

      if (!toAgent) {
        throw new HandoffException(
          request.fromAgentId,
          request.toAgentId,
          "Target agent not found",
        );
      }

      // Check target agent health
      const health = await toAgent.getHealth();
      if (health.status === "unhealthy") {
        throw new HandoffException(
          request.fromAgentId,
          request.toAgentId,
          `Target agent unhealthy: ${health.errors.join(", ")}`,
        );
      }

      const startTime = new Date();

      // Execute task with target agent
      const result = await this.components.agentRuntime.executeAgent({
        agentId: request.toAgentId,
        input: request.input,
        context: {
          requestId: randomUUID(),
          traceId: randomUUID(),
          workspaceId: (request.context.workspaceId as string) || "default",
          userId: (request.context.userId as string) || "system",
          sessionId: request.taskId,
          startTime: new Date(),
          timeout: request.timeout,
          metadata: {
            handoff: true,
            fromAgent: request.fromAgentId,
            reason: request.reason,
            ...request.context,
            ...request.metadata,
          },
        },
        timeout: request.timeout,
      });

      return {
        handoffId,
        fromAgentId: request.fromAgentId,
        toAgentId: request.toAgentId,
        taskId: request.taskId,
        success: result.success,
        handoffAt: startTime,
        completedAt: new Date(),
        result,
        metadata: request.metadata,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown handoff error";
      this.errors.push(`Handoff ${handoffId} failed: ${errorMsg}`);

      return {
        handoffId,
        fromAgentId: request.fromAgentId,
        toAgentId: request.toAgentId,
        taskId: request.taskId,
        success: false,
        handoffAt: new Date(),
        error: errorMsg,
        metadata: request.metadata,
      };
    }
  }

  public async broadcast(request: BroadcastRequest): Promise<BroadcastResult> {
    const broadcastId = randomUUID();
    const startTime = new Date();
    const acknowledgedAgents: string[] = [];
    const failedAgents: string[] = [];
    const errors: string[] = [];

    try {
      // Validate agents
      for (const agentId of request.agentIds) {
        const agent = await this.components.agentRegistry.find(agentId);
        if (!agent) {
          failedAgents.push(agentId);
          errors.push(`Agent '${agentId}' not found`);
          continue;
        }

        try {
          // Send message via communication manager
          const bus = (this.components.communicationManager as any).getBus?.();
          if (bus) {
            const message = {
              messageId: randomUUID(),
              senderAgentId: "coordinator",
              receiverAgentId: agentId,
              workspaceId: request.context.workspaceId,
              requestId: request.context.requestId,
              traceId: request.context.traceId,
              timestamp: new Date(),
              priority: "normal" as any,
              type: "broadcast" as any,
              status: "sent" as any,
              payload: request.message,
              metadata: {
                broadcastId,
                requireAcknowledgment: request.requireAcknowledgment,
                ...request.metadata,
              },
            };

            const sent = await bus.send(message);
            if (sent) {
              acknowledgedAgents.push(agentId);
            } else {
              failedAgents.push(agentId);
              errors.push(`Failed to send message to agent '${agentId}'`);
            }
          } else {
            failedAgents.push(agentId);
            errors.push(
              `Communication bus not available for agent '${agentId}'`,
            );
          }
        } catch (error) {
          failedAgents.push(agentId);
          const errorMsg = `Failed to broadcast to agent '${agentId}': ${error instanceof Error ? error.message : "Unknown error"}`;
          errors.push(errorMsg);
        }
      }

      const success = failedAgents.length === 0;

      if (!success && failedAgents.length === request.agentIds.length) {
        throw new BroadcastException(
          request.agentIds,
          failedAgents,
          "Broadcast failed for all agents",
        );
      }

      return {
        broadcastId,
        agentIds: request.agentIds,
        acknowledgedAgents,
        failedAgents,
        broadcastAt: startTime,
        completedAt: new Date(),
        success,
        errors,
        metadata: request.metadata,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown broadcast error";
      this.errors.push(`Broadcast ${broadcastId} failed: ${errorMsg}`);
      throw error;
    }
  }

  public async collect(coordinationId: string): Promise<CoordinationResult> {
    const task = this.coordinations.get(coordinationId);
    if (!task) {
      throw new CoordinationNotFoundException(coordinationId);
    }

    // Update status to collecting
    task.status = CoordinationStatus.COLLECTING;

    try {
      // Collect results based on strategy
      const result = await this.collectResults(task);

      task.status = CoordinationStatus.SUCCESS;
      task.completedAt = new Date();
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();

      this.totalCoordinationTime += task.duration;

      return result;
    } catch (error) {
      task.status = CoordinationStatus.FAILED;
      task.completedAt = new Date();
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();

      const errorMsg =
        error instanceof Error ? error.message : "Unknown collection error";
      this.errors.push(
        `Collection for coordination ${coordinationId} failed: ${errorMsg}`,
      );

      throw error;
    }
  }

  public async timeout(coordinationId: string): Promise<boolean> {
    const task = this.coordinations.get(coordinationId);
    if (!task) {
      return false;
    }

    try {
      task.status = CoordinationStatus.TIMEOUT;
      task.completedAt = new Date();
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();

      // Cancel any ongoing executions
      // In a real implementation, this would cancel active agent executions

      return true;
    } catch (error) {
      const errorMsg = `Failed to timeout coordination ${coordinationId}: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new CoordinatorException("timeout", coordinationId, errorMsg);
    }
  }

  public async cancel(coordinationId: string): Promise<boolean> {
    const task = this.coordinations.get(coordinationId);
    if (!task) {
      return false;
    }

    try {
      task.status = CoordinationStatus.CANCELLED;
      task.completedAt = new Date();
      task.duration = task.completedAt.getTime() - task.startedAt.getTime();

      // Cancel any ongoing executions
      for (const assignment of task.assignments) {
        try {
          // In a real implementation, this would cancel the specific agent execution
          await this.components.agentRuntime.cancelExecution(assignment.taskId);
        } catch (error) {
          this.warnings.push(
            `Failed to cancel execution for agent '${assignment.agentId}': ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      return true;
    } catch (error) {
      const errorMsg = `Failed to cancel coordination ${coordinationId}: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new CoordinatorException("cancel", coordinationId, errorMsg);
    }
  }

  public async health(): Promise<CoordinatorHealth> {
    const uptime = Date.now() - this.startTime.getTime();
    const activeCoordinations = this.coordinations.size;
    const averageCoordinationTime =
      this.totalCoordinations > 0
        ? this.totalCoordinationTime / this.totalCoordinations
        : 0;

    // Calculate strategy statistics
    const strategyStats: Record<
      CoordinationStrategy,
      { count: number; successRate: number; averageTime: number }
    > = {} as any;

    // Initialize all strategies
    Object.values(CoordinationStrategy).forEach((strategy) => {
      strategyStats[strategy] = { count: 0, successRate: 0, averageTime: 0 };
    });

    // Calculate agent statistics (placeholder implementation)
    const agentStats: Record<
      string,
      {
        assignments: number;
        successes: number;
        failures: number;
        averageTime: number;
      }
    > = {};

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (
      this.errors.length > 0 ||
      this.failedCoordinations > this.successfulCoordinations
    ) {
      status = "unhealthy";
    } else if (this.warnings.length > 0 || activeCoordinations > 10) {
      status = "degraded";
    }

    return {
      status,
      activeCoordinations,
      completedCoordinations:
        this.successfulCoordinations + this.failedCoordinations,
      failedCoordinations: this.failedCoordinations,
      averageCoordinationTime,
      strategyStats,
      agentStats,
      memoryUsage: 0, // Placeholder
      queueSize: activeCoordinations,
      errors: [...this.errors],
      warnings: [...this.warnings],
      lastActivity: new Date(),
      uptime,
      metadata: {
        totalCoordinations: this.totalCoordinations,
        successRate:
          this.totalCoordinations > 0
            ? this.successfulCoordinations / this.totalCoordinations
            : 0,
      },
    };
  }

  private validateCoordinationRequest(request: CoordinationRequest): string[] {
    const errors: string[] = [];

    if (!request.agentIds || request.agentIds.length === 0) {
      errors.push("At least one agent ID is required");
    }

    if (!request.strategy) {
      errors.push("Coordination strategy is required");
    }

    if (!request.context) {
      errors.push("Coordination context is required");
    }

    // Strategy-specific validations
    if (
      request.strategy === CoordinationStrategy.QUORUM &&
      !request.quorumSize
    ) {
      errors.push("Quorum size is required for quorum strategy");
    }

    if (
      request.strategy === CoordinationStrategy.MAJORITY_VOTING &&
      !request.votingMethod
    ) {
      errors.push("Voting method is required for majority voting strategy");
    }

    if (request.quorumSize && request.quorumSize > request.agentIds.length) {
      errors.push("Quorum size cannot exceed number of agents");
    }

    return errors;
  }

  private async validateAgentAvailability(agentIds: string[]): Promise<void> {
    const unavailableAgents: string[] = [];

    for (const agentId of agentIds) {
      const agent = await this.components.agentRegistry.find(agentId);
      if (!agent) {
        unavailableAgents.push(agentId);
        continue;
      }

      const health = await agent.getHealth();
      if (health.status === "unhealthy") {
        unavailableAgents.push(agentId);
      }
    }

    if (unavailableAgents.length > 0) {
      throw new InsufficientAgentsException(
        agentIds.length,
        agentIds.length - unavailableAgents.length,
        `Agents not available: ${unavailableAgents.join(", ")}`,
      );
    }
  }

  private async createAssignments(
    request: CoordinationRequest,
    taskId: string,
  ): Promise<AgentAssignment[]> {
    const assignments: AgentAssignment[] = [];

    for (let i = 0; i < request.agentIds.length; i++) {
      const agentId = request.agentIds[i];

      const assignment: AgentAssignment = {
        agentId,
        taskId: `${taskId}_${i}`,
        assignedAt: new Date(),
        input: request.input,
        priority: request.agentPriorities?.[agentId] || 1,
        weight: request.agentWeights?.[agentId] || 1,
        timeout: request.agentTimeouts?.[agentId] || request.timeoutMs,
        metadata: {
          coordinationStrategy: request.strategy,
          ...request.metadata,
        },
      };

      assignments.push(assignment);
    }

    return assignments;
  }

  private async executeCoordination(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    task.status = CoordinationStatus.RUNNING;

    switch (task.strategy) {
      case CoordinationStrategy.PARALLEL:
        return await this.executeParallel(task, request);

      case CoordinationStrategy.SEQUENTIAL:
        return await this.executeSequential(task, request);

      case CoordinationStrategy.FIRST_SUCCESS:
        return await this.executeFirstSuccess(task, request);

      case CoordinationStrategy.ALL_SUCCESS:
        return await this.executeAllSuccess(task, request);

      case CoordinationStrategy.MAJORITY_VOTING:
        return await this.executeMajorityVoting(task, request);

      case CoordinationStrategy.QUORUM:
        return await this.executeQuorum(task, request);

      default:
        throw new CoordinatorException(
          "execute",
          task.coordinationId,
          `Unsupported coordination strategy: ${task.strategy}`,
        );
    }
  }

  private async executeParallel(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    const promises: Promise<ExecutionResult>[] = [];
    const maxParallelism = request.maxParallelism || task.assignments.length;

    // Execute up to maxParallelism agents in parallel
    for (
      let i = 0;
      i < Math.min(maxParallelism, task.assignments.length);
      i++
    ) {
      const assignment = task.assignments[i];

      const promise = this.delegate(assignment.agentId, assignment.input, {
        coordinationId: task.coordinationId,
        requestId: request.context.requestId,
        traceId: request.context.traceId,
        workspaceId: request.context.workspaceId,
        userId: request.context.userId,
        conversationId: request.context.conversationId,
        executionId: assignment.taskId,
        startTime: new Date(),
        timeout: assignment.timeout,
        cancellationToken: task.cancellationToken,
        metadata: assignment.metadata,
      });

      promises.push(promise);
    }

    // Wait for all to complete
    const results = await Promise.allSettled(promises);

    // Process results
    const successfulAgents: string[] = [];
    const failedAgents: string[] = [];
    const agentResults: Record<string, ExecutionResult> = {};
    const errors: string[] = [];

    results.forEach((result, index) => {
      const assignment = task.assignments[index];

      if (result.status === "fulfilled") {
        successfulAgents.push(assignment.agentId);
        agentResults[assignment.agentId] = result.value;
        task.results[assignment.agentId] = result.value;
      } else {
        failedAgents.push(assignment.agentId);
        errors.push(`Agent '${assignment.agentId}': ${result.reason}`);
      }
    });

    return {
      coordinationId: task.coordinationId,
      taskId: task.taskId,
      status:
        failedAgents.length === 0
          ? CoordinationStatus.SUCCESS
          : CoordinationStatus.FAILED,
      strategy: task.strategy,
      agentResults,
      successfulAgents,
      failedAgents,
      startedAt: task.startedAt,
      completedAt: new Date(),
      duration: Date.now() - task.startedAt.getTime(),
      agentCount: task.assignments.length,
      successCount: successfulAgents.length,
      failureCount: failedAgents.length,
      errors,
      warnings: [],
      metadata: task.metadata,
    };
  }

  private async executeSequential(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    const successfulAgents: string[] = [];
    const failedAgents: string[] = [];
    const agentResults: Record<string, ExecutionResult> = {};
    const errors: string[] = [];

    // Execute agents sequentially
    for (const assignment of task.assignments) {
      try {
        const result = await this.delegate(
          assignment.agentId,
          assignment.input,
          {
            coordinationId: task.coordinationId,
            requestId: request.context.requestId,
            traceId: request.context.traceId,
            workspaceId: request.context.workspaceId,
            userId: request.context.userId,
            conversationId: request.context.conversationId,
            executionId: assignment.taskId,
            startTime: new Date(),
            timeout: assignment.timeout,
            cancellationToken: task.cancellationToken,
            metadata: assignment.metadata,
          },
        );

        successfulAgents.push(assignment.agentId);
        agentResults[assignment.agentId] = result;
        task.results[assignment.agentId] = result;

        // Stop on first failure if failFast is enabled
        if (request.failFast && !result.success) {
          failedAgents.push(assignment.agentId);
          errors.push(`Agent '${assignment.agentId}' failed`);
          break;
        }
      } catch (error) {
        failedAgents.push(assignment.agentId);
        errors.push(
          `Agent '${assignment.agentId}': ${error instanceof Error ? error.message : "Unknown error"}`,
        );

        // Stop on first failure if failFast is enabled
        if (request.failFast) {
          break;
        }
      }
    }

    return {
      coordinationId: task.coordinationId,
      taskId: task.taskId,
      status:
        failedAgents.length === 0
          ? CoordinationStatus.SUCCESS
          : CoordinationStatus.FAILED,
      strategy: task.strategy,
      agentResults,
      successfulAgents,
      failedAgents,
      startedAt: task.startedAt,
      completedAt: new Date(),
      duration: Date.now() - task.startedAt.getTime(),
      agentCount: task.assignments.length,
      successCount: successfulAgents.length,
      failureCount: failedAgents.length,
      errors,
      warnings: [],
      metadata: task.metadata,
    };
  }

  private async executeFirstSuccess(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    return new Promise(async (resolve, reject) => {
      const promises: Promise<ExecutionResult>[] = [];
      const agentResults: Record<string, ExecutionResult> = {};
      const errors: string[] = [];
      let resolved = false;

      // Start all agents in parallel
      task.assignments.forEach((assignment) => {
        const promise = this.delegate(assignment.agentId, assignment.input, {
          coordinationId: task.coordinationId,
          requestId: request.context.requestId,
          traceId: request.context.traceId,
          workspaceId: request.context.workspaceId,
          userId: request.context.userId,
          conversationId: request.context.conversationId,
          executionId: assignment.taskId,
          startTime: new Date(),
          timeout: assignment.timeout,
          cancellationToken: task.cancellationToken,
          metadata: assignment.metadata,
        });

        promise
          .then((result) => {
            agentResults[assignment.agentId] = result;
            task.results[assignment.agentId] = result;

            if (!resolved && result.success) {
              resolved = true;
              resolve({
                coordinationId: task.coordinationId,
                taskId: task.taskId,
                status: CoordinationStatus.SUCCESS,
                strategy: task.strategy,
                finalResult: result.output,
                agentResults,
                successfulAgents: [assignment.agentId],
                failedAgents: [],
                startedAt: task.startedAt,
                completedAt: new Date(),
                duration: Date.now() - task.startedAt.getTime(),
                agentCount: task.assignments.length,
                successCount: 1,
                failureCount: 0,
                errors,
                warnings: [],
                metadata: task.metadata,
              });
            }
          })
          .catch((error) => {
            errors.push(
              `Agent '${assignment.agentId}': ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          });

        promises.push(promise);
      });

      // Wait for all to complete if no success found
      Promise.allSettled(promises).then(() => {
        if (!resolved) {
          resolve({
            coordinationId: task.coordinationId,
            taskId: task.taskId,
            status: CoordinationStatus.FAILED,
            strategy: task.strategy,
            agentResults,
            successfulAgents: [],
            failedAgents: task.assignments.map((a) => a.agentId),
            startedAt: task.startedAt,
            completedAt: new Date(),
            duration: Date.now() - task.startedAt.getTime(),
            agentCount: task.assignments.length,
            successCount: 0,
            failureCount: task.assignments.length,
            errors,
            warnings: [],
            metadata: task.metadata,
          });
        }
      });
    });
  }

  private async executeAllSuccess(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    // Similar to parallel execution, but requires ALL to succeed
    const result = await this.executeParallel(task, request);

    if (result.failureCount > 0) {
      result.status = CoordinationStatus.FAILED;
    }

    return result;
  }

  private async executeMajorityVoting(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    // Execute all agents first
    const parallelResult = await this.executeParallel(task, request);

    // Collect votes from successful executions
    const votes: Record<string, unknown> = {};
    const voteDistribution: Record<string, number> = {};

    for (const agentId of parallelResult.successfulAgents) {
      const result = parallelResult.agentResults[agentId];
      const vote = result.output;
      const voteKey = JSON.stringify(vote);

      votes[agentId] = vote;
      voteDistribution[voteKey] =
        (voteDistribution[voteKey] || 0) +
        (task.assignments.find((a) => a.agentId === agentId)?.weight || 1);
    }

    // Determine winning vote based on voting method
    const votingMethod = task.votingMethod || VotingMethod.SIMPLE_MAJORITY;
    const winningVote = this.determineWinningVote(
      voteDistribution,
      votingMethod,
      parallelResult.successCount,
    );

    return {
      ...parallelResult,
      votes,
      winningVote,
      voteDistribution,
      finalResult: winningVote,
      status:
        winningVote !== undefined
          ? CoordinationStatus.SUCCESS
          : CoordinationStatus.FAILED,
    };
  }

  private async executeQuorum(
    task: CoordinationTask,
    request: CoordinationRequest,
  ): Promise<CoordinationResult> {
    const requiredQuorum =
      task.quorumSize || Math.ceil(task.assignments.length / 2);

    // Execute all agents
    const result = await this.executeParallel(task, request);

    // Check if quorum was reached
    if (result.successCount < requiredQuorum) {
      throw new QuorumNotReachedException(requiredQuorum, result.successCount);
    }

    return {
      ...result,
      status: CoordinationStatus.SUCCESS,
      metadata: {
        ...result.metadata,
        quorumRequired: requiredQuorum,
        quorumAchieved: result.successCount,
      },
    };
  }

  private async collectResults(
    task: CoordinationTask,
  ): Promise<CoordinationResult> {
    // This method would be used to collect results from ongoing executions
    // For simplicity, returning the current state
    const successfulAgents = Object.keys(task.results).filter(
      (agentId) => task.results[agentId]?.success,
    );
    const failedAgents = Object.keys(task.results).filter(
      (agentId) => !task.results[agentId]?.success,
    );

    return {
      coordinationId: task.coordinationId,
      taskId: task.taskId,
      status: task.status,
      strategy: task.strategy,
      agentResults: task.results,
      successfulAgents,
      failedAgents,
      startedAt: task.startedAt,
      completedAt: task.completedAt || new Date(),
      duration: task.duration || Date.now() - task.startedAt.getTime(),
      agentCount: task.assignments.length,
      successCount: successfulAgents.length,
      failureCount: failedAgents.length,
      errors: [],
      warnings: [],
      metadata: task.metadata,
    };
  }

  private determineWinningVote(
    voteDistribution: Record<string, number>,
    votingMethod: VotingMethod,
    totalVotes: number,
  ): unknown {
    const entries = Object.entries(voteDistribution);
    if (entries.length === 0) {
      return undefined;
    }

    // Sort by vote count (descending)
    entries.sort(([, a], [, b]) => b - a);

    const [winningVoteKey, winningCount] = entries[0];

    switch (votingMethod) {
      case VotingMethod.SIMPLE_MAJORITY:
        return winningCount > totalVotes / 2
          ? JSON.parse(winningVoteKey)
          : undefined;

      case VotingMethod.SUPER_MAJORITY:
        return winningCount >= totalVotes * 0.67
          ? JSON.parse(winningVoteKey)
          : undefined;

      case VotingMethod.UNANIMOUS:
        return winningCount === totalVotes
          ? JSON.parse(winningVoteKey)
          : undefined;

      case VotingMethod.WEIGHTED_MAJORITY:
        // For weighted majority, we already calculated weights in voteDistribution
        return winningCount > totalVotes / 2
          ? JSON.parse(winningVoteKey)
          : undefined;

      default:
        throw new VotingException(votingMethod, "Unsupported voting method");
    }
  }
}
