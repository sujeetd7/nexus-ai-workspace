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
  MemoryOperation,
  MemoryType,
  MemoryOperationRequest,
  MemoryLoadRequest,
  MemorySaveRequest,
  MemorySummaryRequest,
  MemoryClearRequest,
  MemoryOperationResult,
  MemoryLoadResult,
  MemorySaveResult,
  MemorySummaryResult,
  MemoryClearResult,
  MemoryAgentHealth,
  MemoryAgentMetrics,
} from "./memory-agent.types";
import {
  MemoryAgentException,
  InvalidMemoryOperationException,
  MemoryOperationFailedException,
  MemorySummaryUnavailableException,
  MemoryNotAvailableException,
  InvalidMemoryContextException,
} from "./memory-agent.exceptions";
import { IAgentMemory } from "../../memory/agent-memory";
import {
  IConversationMemory,
  ConversationMemory,
} from "../../memory/conversation-memory";
import {
  IWorkspaceMemory,
  WorkspaceMemory,
} from "../../memory/workspace-memory";
import {
  IScratchpadMemory,
  ScratchpadMemory,
} from "../../memory/scratchpad-memory";
import { ISharedMemory, SharedMemory } from "../../memory/shared-memory";
import {
  MemoryContext,
  MemoryContextBuilder,
} from "../../memory/memory-context";

export interface MemoryAgentComponents {
  conversationMemory: IConversationMemory;
  workspaceMemory: IWorkspaceMemory;
  scratchpadMemory: IScratchpadMemory;
  sharedMemory: ISharedMemory;
}

export class MemoryAgent implements IAgent {
  public readonly metadata: IAgentMetadata;
  public readonly type: AgentType = AgentType.SERVICE;
  public readonly priority: AgentPriority = AgentPriority.NORMAL;
  public readonly capabilities: IAgentCapability[];

  private agentStatus: AgentStatus = AgentStatus.IDLE;
  private agentHealth: AgentHealth;
  private readonly startTime: Date = new Date();

  // Memory components
  private readonly memoryComponents: MemoryAgentComponents;

  // Metrics
  private readonly operationCounts: Record<MemoryOperation, number> =
    {} as Record<MemoryOperation, number>;
  private readonly successCounts: Record<MemoryOperation, number> =
    {} as Record<MemoryOperation, number>;
  private readonly errorCounts: Record<MemoryOperation, number> = {} as Record<
    MemoryOperation,
    number
  >;
  private readonly responseTimes: Record<MemoryOperation, number[]> =
    {} as Record<MemoryOperation, number[]>;

  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];
  private lastActivity?: Date;

  constructor(components?: Partial<MemoryAgentComponents>) {
    this.metadata = {
      id: "memory-agent",
      name: "Memory Agent",
      description:
        "Built-in agent for memory operations including conversation, workspace, scratchpad, and shared memory management",
      version: "1.0.0",
      author: "Agent Runtime System",
      tags: ["memory", "builtin", "utility"],
      category: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.capabilities = [
      {
        id: "conversation-memory",
        name: "Conversation Memory",
        description: "Load and save conversation history",
        inputSchema: { operation: "string", key: "string", value: "object" },
        outputSchema: { success: "boolean", value: "object" },
        parameters: { maxHistory: 1000 },
        dependencies: [],
      },
      {
        id: "workspace-memory",
        name: "Workspace Memory",
        description: "Load and save workspace-scoped data",
        inputSchema: { operation: "string", key: "string", value: "object" },
        outputSchema: { success: "boolean", value: "object" },
        parameters: { maxSize: 10000 },
        dependencies: [],
      },
      {
        id: "scratchpad",
        name: "Scratchpad Memory",
        description: "Load and save execution-scoped temporary data",
        inputSchema: { operation: "string", key: "string", value: "object" },
        outputSchema: { success: "boolean", value: "object" },
        parameters: { ttl: 3600000 },
        dependencies: [],
      },
      {
        id: "shared-memory",
        name: "Shared Memory",
        description: "Load and save data shared across multiple agents",
        inputSchema: { operation: "string", key: "string", value: "object" },
        outputSchema: { success: "boolean", value: "object" },
        parameters: { lockTimeout: 5000 },
        dependencies: [],
      },
    ];

    // Initialize memory components
    this.memoryComponents = {
      conversationMemory:
        components?.conversationMemory || new ConversationMemory(),
      workspaceMemory: components?.workspaceMemory || new WorkspaceMemory(),
      scratchpadMemory: components?.scratchpadMemory || new ScratchpadMemory(),
      sharedMemory: components?.sharedMemory || new SharedMemory(),
    };

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

      // Validate memory components
      if (!this.memoryComponents.conversationMemory) {
        throw new MemoryNotAvailableException("conversation");
      }
      if (!this.memoryComponents.workspaceMemory) {
        throw new MemoryNotAvailableException("workspace");
      }
      if (!this.memoryComponents.scratchpadMemory) {
        throw new MemoryNotAvailableException("scratchpad");
      }
      if (!this.memoryComponents.sharedMemory) {
        throw new MemoryNotAvailableException("shared");
      }

      this.agentStatus = AgentStatus.IDLE;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to initialize memory agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new MemoryAgentException("initialize", errorMsg);
    }
  }

  public async shutdown(): Promise<void> {
    try {
      this.agentStatus = AgentStatus.SHUTTING_DOWN;

      // Cleanup resources if needed
      // Memory components are in-memory, no special cleanup required

      this.agentStatus = AgentStatus.STOPPED;
    } catch (error) {
      this.agentStatus = AgentStatus.ERROR;
      const errorMsg = `Failed to shutdown memory agent: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      throw new MemoryAgentException("shutdown", errorMsg);
    }
  }

  public async getHealth(): Promise<AgentHealth> {
    try {
      const uptime = Date.now() - this.startTime.getTime();

      // Get memory health from components (using base memory interface methods)
      const conversationHealth = await (
        this.memoryComponents.conversationMemory as any
      ).health();
      const workspaceHealth = await (
        this.memoryComponents.workspaceMemory as any
      ).health();
      const scratchpadHealth = await (
        this.memoryComponents.scratchpadMemory as any
      ).health();
      const sharedHealth = await (
        this.memoryComponents.sharedMemory as any
      ).health();

      // Aggregate health status
      const allHealthy = [
        conversationHealth,
        workspaceHealth,
        scratchpadHealth,
        sharedHealth,
      ].every((h) => h.status === "healthy");

      const anyUnhealthy = [
        conversationHealth,
        workspaceHealth,
        scratchpadHealth,
        sharedHealth,
      ].some((h) => h.status === "unhealthy");

      const memoryUsage =
        conversationHealth.usedSize +
        workspaceHealth.usedSize +
        scratchpadHealth.usedSize +
        sharedHealth.usedSize;

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (anyUnhealthy || this.errors.length > 0) {
        status = "unhealthy";
      } else if (!allHealthy || this.warnings.length > 0) {
        status = "degraded";
      }

      this.agentHealth = {
        status,
        uptime,
        lastHeartbeat: new Date(),
        memoryUsage,
        cpuUsage: 0, // Placeholder
        errors: [...this.errors],
        warnings: [...this.warnings],
        metrics: {
          conversationCacheSize: conversationHealth.totalSize,
          workspaceCacheSize: workspaceHealth.totalSize,
          scratchpadCacheSize: scratchpadHealth.totalSize,
          sharedCacheSize: sharedHealth.totalSize,
        },
      };

      return this.agentHealth;
    } catch (error) {
      const errorMsg = `Failed to get memory agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
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
      let result: MemoryOperationResult;

      switch (request.operation) {
        case MemoryOperation.LOAD_CONVERSATION:
          result = await this.loadConversation(
            request as MemoryLoadRequest,
            context,
          );
          break;
        case MemoryOperation.SAVE_CONVERSATION:
          result = await this.saveConversation(
            request as MemorySaveRequest,
            context,
          );
          break;
        case MemoryOperation.LOAD_WORKSPACE:
          result = await this.loadWorkspace(
            request as MemoryLoadRequest,
            context,
          );
          break;
        case MemoryOperation.SAVE_WORKSPACE:
          result = await this.saveWorkspace(
            request as MemorySaveRequest,
            context,
          );
          break;
        case MemoryOperation.LOAD_SCRATCHPAD:
          result = await this.loadScratchpad(
            request as MemoryLoadRequest,
            context,
          );
          break;
        case MemoryOperation.SAVE_SCRATCHPAD:
          result = await this.saveScratchpad(
            request as MemorySaveRequest,
            context,
          );
          break;
        case MemoryOperation.LOAD_SHARED:
          result = await this.loadShared(request as MemoryLoadRequest, context);
          break;
        case MemoryOperation.SAVE_SHARED:
          result = await this.saveShared(request as MemorySaveRequest, context);
          break;
        case MemoryOperation.SUMMARY:
          result = await this.summarizeConversation(
            request as MemorySummaryRequest,
            context,
          );
          break;
        case MemoryOperation.CLEAR:
          result = await this.clearMemory(
            request as MemoryClearRequest,
            context,
          );
          break;
        default:
          throw new InvalidMemoryOperationException(
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
        this.recordOperationError(input.operation as MemoryOperation, duration);
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

  // Individual memory operations
  public async loadConversation(
    request: MemoryLoadRequest,
    context: IAgentExecutionContext,
  ): Promise<MemoryLoadResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);
      const value =
        await this.memoryComponents.conversationMemory.history(memoryContext);

      return {
        success: true,
        operation: MemoryOperation.LOAD_CONVERSATION,
        type: MemoryType.CONVERSATION,
        key: request.key,
        found: value !== undefined && value.length > 0,
        value,
        metadata: {
          itemCount: Array.isArray(value) ? value.length : 0,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to load conversation: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.LOAD_CONVERSATION,
        MemoryType.CONVERSATION,
        request.key,
        errorMsg,
      );
    }
  }

  public async saveConversation(
    request: MemorySaveRequest,
    context: IAgentExecutionContext,
  ): Promise<MemorySaveResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);

      // For conversation memory, we expect the value to be a conversation message
      if (!request.value || typeof request.value !== "object") {
        throw new Error("Invalid conversation message format");
      }

      const message = request.value as any;
      await this.memoryComponents.conversationMemory.append(
        message,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.SAVE_CONVERSATION,
        type: MemoryType.CONVERSATION,
        key: request.key,
        saved: true,
        metadata: {
          messageId: message.id,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to save conversation: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.SAVE_CONVERSATION,
        MemoryType.CONVERSATION,
        request.key,
        errorMsg,
      );
    }
  }

  public async loadWorkspace(
    request: MemoryLoadRequest,
    context: IAgentExecutionContext,
  ): Promise<MemoryLoadResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);
      const value = await (this.memoryComponents.workspaceMemory as any).load(
        request.key,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.LOAD_WORKSPACE,
        type: MemoryType.WORKSPACE,
        key: request.key,
        found: value !== undefined,
        value,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to load workspace data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.LOAD_WORKSPACE,
        MemoryType.WORKSPACE,
        request.key,
        errorMsg,
      );
    }
  }

  public async saveWorkspace(
    request: MemorySaveRequest,
    context: IAgentExecutionContext,
  ): Promise<MemorySaveResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);

      // Get previous value if exists
      const previousValue = await (
        this.memoryComponents.workspaceMemory as any
      ).load(request.key, memoryContext);

      await (this.memoryComponents.workspaceMemory as any).save(
        request.key,
        request.value,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.SAVE_WORKSPACE,
        type: MemoryType.WORKSPACE,
        key: request.key,
        saved: true,
        previousValue,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to save workspace data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.SAVE_WORKSPACE,
        MemoryType.WORKSPACE,
        request.key,
        errorMsg,
      );
    }
  }

  public async loadScratchpad(
    request: MemoryLoadRequest,
    context: IAgentExecutionContext,
  ): Promise<MemoryLoadResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);
      const value = await (this.memoryComponents.scratchpadMemory as any).load(
        request.key,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.LOAD_SCRATCHPAD,
        type: MemoryType.SCRATCHPAD,
        key: request.key,
        found: value !== undefined,
        value,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to load scratchpad data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.LOAD_SCRATCHPAD,
        MemoryType.SCRATCHPAD,
        request.key,
        errorMsg,
      );
    }
  }

  public async saveScratchpad(
    request: MemorySaveRequest,
    context: IAgentExecutionContext,
  ): Promise<MemorySaveResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);

      // Get previous value if exists
      const previousValue = await (
        this.memoryComponents.scratchpadMemory as any
      ).load(request.key, memoryContext);

      await (this.memoryComponents.scratchpadMemory as any).save(
        request.key,
        request.value,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.SAVE_SCRATCHPAD,
        type: MemoryType.SCRATCHPAD,
        key: request.key,
        saved: true,
        previousValue,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to save scratchpad data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.SAVE_SCRATCHPAD,
        MemoryType.SCRATCHPAD,
        request.key,
        errorMsg,
      );
    }
  }

  public async loadShared(
    request: MemoryLoadRequest,
    context: IAgentExecutionContext,
  ): Promise<MemoryLoadResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);
      const value = await this.memoryComponents.sharedMemory.read(
        request.key,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.LOAD_SHARED,
        type: MemoryType.SHARED,
        key: request.key,
        found: value !== undefined,
        value,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to load shared data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.LOAD_SHARED,
        MemoryType.SHARED,
        request.key,
        errorMsg,
      );
    }
  }

  public async saveShared(
    request: MemorySaveRequest,
    context: IAgentExecutionContext,
  ): Promise<MemorySaveResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);

      // Get previous value if exists
      const previousValue = await this.memoryComponents.sharedMemory.read(
        request.key,
        memoryContext,
      );

      await this.memoryComponents.sharedMemory.write(
        request.key,
        request.value,
        0,
        memoryContext,
      );

      return {
        success: true,
        operation: MemoryOperation.SAVE_SHARED,
        type: MemoryType.SHARED,
        key: request.key,
        saved: true,
        previousValue,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to save shared data: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.SAVE_SHARED,
        MemoryType.SHARED,
        request.key,
        errorMsg,
      );
    }
  }

  public async summarizeConversation(
    request: MemorySummaryRequest,
    context: IAgentExecutionContext,
  ): Promise<MemorySummaryResult> {
    // NOTE: As per requirements, we should NOT call LLM for summary generation
    // We should only use existing memory service abstraction if available
    // Otherwise throw MemorySummaryUnavailableException

    throw new MemorySummaryUnavailableException(
      request.type,
      "Summary generation requires an external summary service which is not available",
    );
  }

  public async clearConversation(
    context: IAgentExecutionContext,
  ): Promise<MemoryClearResult> {
    return await this.clearMemory(
      { operation: MemoryOperation.CLEAR, type: MemoryType.CONVERSATION },
      context,
    );
  }

  public async clearWorkspace(
    context: IAgentExecutionContext,
  ): Promise<MemoryClearResult> {
    return await this.clearMemory(
      { operation: MemoryOperation.CLEAR, type: MemoryType.WORKSPACE },
      context,
    );
  }

  private async clearMemory(
    request: MemoryClearRequest,
    context: IAgentExecutionContext,
  ): Promise<MemoryClearResult> {
    try {
      const memoryContext = this.buildMemoryContext(context);
      let itemsCleared = 0;

      switch (request.type) {
        case MemoryType.CONVERSATION:
          itemsCleared = await (
            this.memoryComponents.conversationMemory as any
          ).size(memoryContext);
          await this.memoryComponents.conversationMemory.clear(memoryContext);
          break;

        case MemoryType.WORKSPACE:
          itemsCleared = await (
            this.memoryComponents.workspaceMemory as any
          ).size(memoryContext);
          await (this.memoryComponents.workspaceMemory as any).clear(
            memoryContext,
          );
          break;

        case MemoryType.SCRATCHPAD:
          itemsCleared = await (
            this.memoryComponents.scratchpadMemory as any
          ).size(memoryContext);
          await (this.memoryComponents.scratchpadMemory as any).clear(
            memoryContext,
          );
          break;

        case MemoryType.SHARED:
          // For shared memory, we use the base memory clear method
          itemsCleared = await (this.memoryComponents.sharedMemory as any).size(
            memoryContext,
          );
          await (this.memoryComponents.sharedMemory as any).clear(
            memoryContext,
          );
          break;

        default:
          throw new Error(
            `Unsupported memory type for clear operation: ${request.type}`,
          );
      }

      return {
        success: true,
        operation: MemoryOperation.CLEAR,
        type: request.type,
        cleared: true,
        itemsCleared,
        metadata: {
          timestamp: new Date(),
        },
      };
    } catch (error) {
      const errorMsg = `Failed to clear ${request.type} memory: ${error instanceof Error ? error.message : "Unknown error"}`;
      throw new MemoryOperationFailedException(
        MemoryOperation.CLEAR,
        request.type,
        undefined,
        errorMsg,
      );
    }
  }

  public async getMemoryAgentHealth(): Promise<MemoryAgentHealth> {
    try {
      // Get health from each memory component
      const conversationHealth = await (
        this.memoryComponents.conversationMemory as any
      ).health();
      const workspaceHealth = await (
        this.memoryComponents.workspaceMemory as any
      ).health();
      const scratchpadHealth = await (
        this.memoryComponents.scratchpadMemory as any
      ).health();
      const sharedHealth = await (
        this.memoryComponents.sharedMemory as any
      ).health();

      // Determine overall status
      const allHealthy = [
        conversationHealth,
        workspaceHealth,
        scratchpadHealth,
        sharedHealth,
      ].every((h) => h.status === "healthy");

      const anyUnhealthy = [
        conversationHealth,
        workspaceHealth,
        scratchpadHealth,
        sharedHealth,
      ].some((h) => h.status === "unhealthy");

      let status: "healthy" | "degraded" | "unhealthy" = "healthy";
      if (anyUnhealthy || this.errors.length > 0) {
        status = "unhealthy";
      } else if (!allHealthy || this.warnings.length > 0) {
        status = "degraded";
      }

      return {
        memoryAvailable: true,
        provider: "in-memory",
        cacheSize: {
          conversation: conversationHealth.totalSize,
          workspace: workspaceHealth.totalSize,
          scratchpad: scratchpadHealth.totalSize,
          shared: sharedHealth.totalSize,
        },
        status,
        errors: [...this.errors],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: {
          conversationHealth,
          workspaceHealth,
          scratchpadHealth,
          sharedHealth,
        },
      };
    } catch (error) {
      const errorMsg = `Failed to get memory agent health: ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);

      return {
        memoryAvailable: false,
        provider: "unknown",
        cacheSize: {
          conversation: 0,
          workspace: 0,
          scratchpad: 0,
          shared: 0,
        },
        status: "unhealthy",
        errors: [errorMsg],
        warnings: [...this.warnings],
        lastActivity: this.lastActivity,
        metadata: { error: errorMsg },
      };
    }
  }

  public getMetrics(): MemoryAgentMetrics {
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

    // Calculate average response times
    const averageResponseTimes: Record<MemoryOperation, number> = {} as Record<
      MemoryOperation,
      number
    >;
    Object.keys(this.responseTimes).forEach((op) => {
      const operation = op as MemoryOperation;
      const times = this.responseTimes[operation];
      averageResponseTimes[operation] =
        times.length > 0
          ? times.reduce((sum, time) => sum + time, 0) / times.length
          : 0;
    });

    return {
      operationCounts: { ...this.operationCounts },
      successCounts: { ...this.successCounts },
      errorCounts: { ...this.errorCounts },
      averageResponseTimes,
      totalOperations,
      successRate,
      uptime: Date.now() - this.startTime.getTime(),
      memoryUsage: {
        conversation: 0, // Would be calculated from actual memory usage
        workspace: 0,
        scratchpad: 0,
        shared: 0,
        total: 0,
      },
    };
  }

  // Private helper methods
  private validateAndParseRequest(input: unknown): MemoryOperationRequest {
    if (!input || typeof input !== "object") {
      throw new InvalidMemoryOperationException(
        "unknown",
        "Input must be an object",
      );
    }

    const request = input as Record<string, unknown>;

    if (!request.operation || typeof request.operation !== "string") {
      throw new InvalidMemoryOperationException(
        "unknown",
        "Operation is required and must be a string",
      );
    }

    if (
      !Object.values(MemoryOperation).includes(
        request.operation as MemoryOperation,
      )
    ) {
      throw new InvalidMemoryOperationException(
        request.operation as string,
        "Unsupported operation",
      );
    }

    // Validate operation-specific requirements
    const operation = request.operation as MemoryOperation;

    if (
      [
        MemoryOperation.LOAD_CONVERSATION,
        MemoryOperation.LOAD_WORKSPACE,
        MemoryOperation.LOAD_SCRATCHPAD,
        MemoryOperation.LOAD_SHARED,
      ].includes(operation)
    ) {
      if (!request.key || typeof request.key !== "string") {
        throw new InvalidMemoryOperationException(
          operation,
          "Key is required for load operations",
        );
      }
    }

    if (
      [
        MemoryOperation.SAVE_CONVERSATION,
        MemoryOperation.SAVE_WORKSPACE,
        MemoryOperation.SAVE_SCRATCHPAD,
        MemoryOperation.SAVE_SHARED,
      ].includes(operation)
    ) {
      if (!request.key || typeof request.key !== "string") {
        throw new InvalidMemoryOperationException(
          operation,
          "Key is required for save operations",
        );
      }
      if (request.value === undefined) {
        throw new InvalidMemoryOperationException(
          operation,
          "Value is required for save operations",
        );
      }
    }

    if (
      operation === MemoryOperation.SUMMARY ||
      operation === MemoryOperation.CLEAR
    ) {
      if (
        !request.type ||
        !Object.values(MemoryType).includes(request.type as MemoryType)
      ) {
        throw new InvalidMemoryOperationException(
          operation,
          "Valid memory type is required",
        );
      }
    }

    return {
      operation: request.operation as MemoryOperation,
      type: request.type as MemoryType | undefined,
      key: request.key as string | undefined,
      value: request.value,
      metadata: (request.metadata as Record<string, unknown>) || {},
    };
  }

  private buildMemoryContext(context: IAgentExecutionContext): MemoryContext {
    const missingFields: string[] = [];

    if (!context.requestId) missingFields.push("requestId");
    if (!context.traceId) missingFields.push("traceId");
    if (!context.workspaceId) missingFields.push("workspaceId");
    if (!context.userId) missingFields.push("userId");

    if (missingFields.length > 0) {
      throw new InvalidMemoryContextException(missingFields);
    }

    const builder = MemoryContextBuilder.create()
      .requestId(context.requestId)
      .traceId(context.traceId)
      .workspaceId(context.workspaceId)
      .userId(context.userId)
      .agentId(this.metadata.id)
      .executionId(context.sessionId)
      .metadata(context.metadata);

    if (context.conversationId) {
      builder.conversationId(context.conversationId);
    }

    return builder.build();
  }

  private initializeMetrics(): void {
    Object.values(MemoryOperation).forEach((operation) => {
      this.operationCounts[operation] = 0;
      this.successCounts[operation] = 0;
      this.errorCounts[operation] = 0;
      this.responseTimes[operation] = [];
    });
  }

  private recordOperationAttempt(operation: MemoryOperation): void {
    this.operationCounts[operation]++;
  }

  private recordOperationSuccess(
    operation: MemoryOperation,
    duration: number,
  ): void {
    this.successCounts[operation]++;
    this.responseTimes[operation].push(duration);

    // Keep only last 100 response times per operation
    if (this.responseTimes[operation].length > 100) {
      this.responseTimes[operation].shift();
    }
  }

  private recordOperationError(
    operation: MemoryOperation,
    duration: number,
  ): void {
    this.errorCounts[operation]++;
    this.responseTimes[operation].push(duration);

    // Keep only last 100 response times per operation
    if (this.responseTimes[operation].length > 100) {
      this.responseTimes[operation].shift();
    }
  }
}
