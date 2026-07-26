import { ToolRegistry } from "../registry/tool-registry";
import { ToolTelemetry } from "./tool-telemetry";
import { ToolExecutionRequest, ToolExecutionResponse } from "./tool-executor";
import { EnhancedToolExecutionRequest } from "./enhanced-tool-execution-request";
import { MCPToolBridge } from "../../mcp/bridge/mcp-tool-bridge";
import { ExecutionContextBuilder } from "../../mcp/runtime/execution-context";

export class EnhancedToolExecutor {
  private readonly telemetry = new ToolTelemetry();

  constructor(private readonly registry: ToolRegistry) {}

  public async execute(
    request: EnhancedToolExecutionRequest,
  ): Promise<ToolExecutionResponse> {
    const tool = this.registry.get(request.tool);

    if (!tool) {
      throw new Error(`Tool '${request.tool}' not found.`);
    }

    if (!tool.enabled) {
      throw new Error(`Tool '${request.tool}' is disabled.`);
    }

    const startedAt = this.telemetry.onStart(tool.name, request.requestId);

    try {
      let result: any;

      // Check if this is an MCP tool
      if (tool instanceof MCPToolBridge) {
        // For MCP tools, inject execution context into the input
        const enhancedInput = this.enhanceInputForMCPTool(request);
        result = await tool.execute(enhancedInput);
      } else {
        // For built-in tools, execute normally
        result = await tool.execute(request.input);
      }

      this.telemetry.onSuccess(tool.name, request.requestId, startedAt);

      return {
        success: true,
        data: result,
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      this.telemetry.onFailure(tool.name, request.requestId, startedAt, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      };
    }
  }

  public async executeMany(
    requests: EnhancedToolExecutionRequest[],
  ): Promise<ToolExecutionResponse[]> {
    const responses: ToolExecutionResponse[] = [];

    for (const request of requests) {
      responses.push(await this.execute(request));
    }

    return responses;
  }

  // Backward compatibility method
  public async executeLegacy(
    request: ToolExecutionRequest,
  ): Promise<ToolExecutionResponse> {
    // Convert legacy request to enhanced request
    const enhancedRequest: EnhancedToolExecutionRequest = {
      tool: request.tool,
      input: request.input,
      requestId: request.requestId,
      // No context for legacy requests
    };

    return this.execute(enhancedRequest);
  }

  private enhanceInputForMCPTool(request: EnhancedToolExecutionRequest): any {
    // For MCP tools, we need to inject the execution context
    if (request.context) {
      const contextBuilder = ExecutionContextBuilder.create()
        .requestId(request.requestId);

      // Add context fields if available
      if (request.context.workspaceId) {
        contextBuilder.workspaceId(request.context.workspaceId);
      }
      if (request.context.userId) {
        contextBuilder.userId(request.context.userId);
      }
      if (request.context.traceId) {
        contextBuilder.traceId(request.context.traceId);
      }
      if (request.context.sessionId) {
        contextBuilder.sessionId(request.context.sessionId);
      }

      // Add metadata
      if (request.context.metadata) {
        contextBuilder.metadata(request.context.metadata);
      }

      // Add timeout from options
      if (request.options?.timeout) {
        contextBuilder.timeout(request.options.timeout);
      }

      try {
        // Only build context if we have all required fields
        if (request.context.workspaceId && 
            request.context.userId && 
            request.context.traceId && 
            request.context.sessionId) {
          
          const executionContext = contextBuilder.build();
          
          // Inject context into the input
          return {
            ...request.input,
            _security: {
              userId: executionContext.userId,
              workspaceId: executionContext.workspaceId,
              sessionId: executionContext.sessionId,
              serverId: executionContext.traceId, // Use traceId as serverId for now
              roles: [],
              permissions: []
            },
            __context: executionContext
          };
        } else {
          // If missing required context fields, fall back to original input
          return request.input;
        }
      } catch (error) {
        // If context building fails, fall back to original input
        return request.input;
      }
    }

    // If no context provided, return original input
    return request.input;
  }
}