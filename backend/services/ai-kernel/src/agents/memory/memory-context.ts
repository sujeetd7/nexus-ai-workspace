export interface MemoryContext {
  requestId: string;
  traceId: string;
  workspaceId: string;
  userId: string;
  conversationId?: string;
  agentId: string;
  executionId: string;
  metadata: Record<string, unknown>;
}

export class MemoryContextBuilder {
  private context: Partial<MemoryContext> = {};

  public requestId(requestId: string): MemoryContextBuilder {
    this.context.requestId = requestId;
    return this;
  }

  public traceId(traceId: string): MemoryContextBuilder {
    this.context.traceId = traceId;
    return this;
  }

  public workspaceId(workspaceId: string): MemoryContextBuilder {
    this.context.workspaceId = workspaceId;
    return this;
  }

  public userId(userId: string): MemoryContextBuilder {
    this.context.userId = userId;
    return this;
  }

  public conversationId(conversationId: string): MemoryContextBuilder {
    this.context.conversationId = conversationId;
    return this;
  }

  public agentId(agentId: string): MemoryContextBuilder {
    this.context.agentId = agentId;
    return this;
  }

  public executionId(executionId: string): MemoryContextBuilder {
    this.context.executionId = executionId;
    return this;
  }

  public metadata(metadata: Record<string, unknown>): MemoryContextBuilder {
    this.context.metadata = { ...this.context.metadata, ...metadata };
    return this;
  }

  public build(): MemoryContext {
    const requiredFields = [
      "requestId",
      "traceId",
      "workspaceId",
      "userId",
      "agentId",
      "executionId",
    ];

    for (const field of requiredFields) {
      if (!this.context[field as keyof MemoryContext]) {
        throw new Error(`Memory context field '${field}' is required`);
      }
    }

    return {
      requestId: this.context.requestId!,
      traceId: this.context.traceId!,
      workspaceId: this.context.workspaceId!,
      userId: this.context.userId!,
      conversationId: this.context.conversationId,
      agentId: this.context.agentId!,
      executionId: this.context.executionId!,
      metadata: this.context.metadata || {},
    };
  }

  public static create(): MemoryContextBuilder {
    return new MemoryContextBuilder();
  }
}
