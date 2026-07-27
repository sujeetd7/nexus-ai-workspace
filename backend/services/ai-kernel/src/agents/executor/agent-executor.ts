import { randomUUID } from "crypto";
import { ExecutionContext, ExecutionResult, ExecutionStatus } from "../types";
import { IAgent, IAgentRegistry } from "../interfaces";
import {
  AgentNotFoundException,
  AgentExecutionException,
  ExecutionTimeoutException,
  ExecutionCancelledException,
} from "../exceptions";

export interface IAgentExecutor {
  execute(
    agent: IAgent,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ExecutionResult>;
  cancel(executionId: string): Promise<void>;
  timeout(executionId: string, timeoutMs: number): Promise<void>;
  validate(agent: IAgent, input: unknown): Promise<boolean>;
  collectMetrics(executionResult: ExecutionResult): Record<string, number>;
}

export class AgentExecutor implements IAgentExecutor {
  private readonly activeExecutions: Map<string, AbortController> = new Map();

  constructor(private readonly registry: IAgentRegistry) {}

  public async execute(
    agent: IAgent,
    input: unknown,
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();
    const startedAt = new Date();

    // Validate input
    await this.validate(agent, input);

    // Create abort controller for this execution
    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);

    // Set up timeout if specified
    let timeoutId: NodeJS.Timeout | undefined;
    if (context.timeout) {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, context.timeout);
    }

    try {
      // Check if already cancelled
      if (
        context.cancellationToken?.aborted ||
        abortController.signal.aborted
      ) {
        throw new ExecutionCancelledException(executionId);
      }

      // Execute the agent (simplified - no actual AI/LLM calls)
      const output = await this.executeAgent(agent, input, {
        ...context,
        cancellationToken: abortController.signal,
      });

      const finishedAt = new Date();
      const latency = Date.now() - startTime;

      const result: ExecutionResult = {
        executionId,
        agentId: agent.metadata.id,
        success: true,
        output,
        startedAt,
        finishedAt,
        latency,
        usage: this.calculateUsage(agent, input, output, latency),
        errors: [],
        metadata: {
          agentType: agent.type,
          agentVersion: agent.metadata.version,
          ...context.metadata,
        },
        status: ExecutionStatus.COMPLETED,
      };

      return result;
    } catch (error) {
      const finishedAt = new Date();
      const latency = Date.now() - startTime;

      let status = ExecutionStatus.FAILED;
      const errors: string[] = [];

      if (error instanceof ExecutionCancelledException) {
        status = ExecutionStatus.CANCELLED;
        errors.push("Execution was cancelled");
      } else if (error instanceof ExecutionTimeoutException) {
        status = ExecutionStatus.TIMEOUT;
        errors.push(`Execution timed out after ${context.timeout}ms`);
      } else {
        errors.push(
          error instanceof Error ? error.message : "Unknown execution error",
        );
      }

      const result: ExecutionResult = {
        executionId,
        agentId: agent.metadata.id,
        success: false,
        output: undefined,
        startedAt,
        finishedAt,
        latency,
        usage: undefined,
        errors,
        metadata: {
          agentType: agent.type,
          agentVersion: agent.metadata.version,
          error: error instanceof Error ? error.name : "UnknownError",
          ...context.metadata,
        },
        status,
      };

      if (!(error instanceof ExecutionCancelledException)) {
        throw new AgentExecutionException(
          agent.metadata.id,
          executionId,
          error instanceof Error ? error.message : "Unknown error",
        );
      }

      return result;
    } finally {
      // Cleanup
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      this.activeExecutions.delete(executionId);
    }
  }

  public async cancel(executionId: string): Promise<void> {
    const abortController = this.activeExecutions.get(executionId);
    if (!abortController) {
      return; // Execution not found or already completed
    }

    abortController.abort();
  }

  public async timeout(executionId: string, timeoutMs: number): Promise<void> {
    const abortController = this.activeExecutions.get(executionId);
    if (!abortController) {
      return; // Execution not found or already completed
    }

    setTimeout(() => {
      if (this.activeExecutions.has(executionId)) {
        abortController.abort();
      }
    }, timeoutMs);
  }

  public async validate(agent: IAgent, input: unknown): Promise<boolean> {
    // Basic validation
    if (!agent) {
      throw new AgentExecutionException(
        "unknown",
        "unknown",
        "Agent is required",
      );
    }

    if (!agent.metadata.id) {
      throw new AgentExecutionException(
        "unknown",
        "unknown",
        "Agent ID is required",
      );
    }

    // Verify agent exists in registry
    const registeredAgent = await this.registry.find(agent.metadata.id);
    if (!registeredAgent) {
      throw new AgentNotFoundException(agent.metadata.id);
    }

    // Check agent health
    const health = await agent.getHealth();
    if (health.status === "unhealthy") {
      throw new AgentExecutionException(
        agent.metadata.id,
        "unknown",
        `Agent is unhealthy: ${health.errors.join(", ")}`,
      );
    }

    // Additional validation could be added here based on agent capabilities and input schema

    return true;
  }

  public collectMetrics(
    executionResult: ExecutionResult,
  ): Record<string, number> {
    return {
      latency: executionResult.latency,
      success: executionResult.success ? 1 : 0,
      failure: executionResult.success ? 0 : 1,
      memoryUsed: executionResult.usage?.memoryUsed || 0,
      cpuTime: executionResult.usage?.cpuTime || 0,
      tokensUsed: executionResult.usage?.tokensUsed || 0,
      cost: executionResult.usage?.cost || 0,
      errorCount: executionResult.errors.length,
    };
  }

  private async executeAgent(
    agent: IAgent,
    input: unknown,
    context: ExecutionContext,
  ): Promise<unknown> {
    // This is a simplified execution that doesn't call external services
    // In a real implementation, this would coordinate with the agent's capabilities

    // Check for cancellation
    if (context.cancellationToken?.aborted) {
      throw new ExecutionCancelledException(context.requestId);
    }

    // Simulate agent processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check for cancellation again
    if (context.cancellationToken?.aborted) {
      throw new ExecutionCancelledException(context.requestId);
    }

    // Return processed result based on agent type and input
    return {
      agentId: agent.metadata.id,
      processedAt: new Date(),
      input: input,
      result: `Processed by ${agent.metadata.name} (${agent.type})`,
      capabilities: agent.capabilities.map((c) => c.id),
      context: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        requestId: context.requestId,
      },
    };
  }

  private calculateUsage(
    agent: IAgent,
    input: unknown,
    output: unknown,
    latencyMs: number,
  ): {
    memoryUsed?: number;
    cpuTime?: number;
    tokensUsed?: number;
    cost?: number;
  } {
    // Simplified usage calculation
    // In a real implementation, this would be based on actual resource consumption

    return {
      memoryUsed: Math.round(latencyMs * 0.1), // Approximate memory usage
      cpuTime: latencyMs,
      tokensUsed: 0, // No LLM tokens used in this executor
      cost: 0, // No external service costs
    };
  }
}
