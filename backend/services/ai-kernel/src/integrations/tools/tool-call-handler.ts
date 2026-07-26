import { ToolRegistry } from "../../tools/registry/tool-registry";
import { EnhancedToolExecutor } from "../../tools/runtime/enhanced-tool-executor";

export interface ToolExecutionRequest {
  name: string;
  arguments: string;
  callId: string;
  context?: {
    workspaceId?: string;
    userId?: string;
    traceId?: string;
    sessionId?: string;
    conversationId?: string;
  };
}

export interface ToolExecutionResult {
  callId: string;
  name: string;
  result: any;
  error?: string;
  success: boolean;
}

export interface ToolCallHandler {
  executeTools(requests: ToolExecutionRequest[]): Promise<ToolExecutionResult[]>;
}

export class KernelToolCallHandler implements ToolCallHandler {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: EnhancedToolExecutor
  ) {}

  async executeTools(requests: ToolExecutionRequest[]): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const request of requests) {
      try {
        // Parse the arguments
        let parsedArguments: any = {};
        try {
          parsedArguments = JSON.parse(request.arguments);
        } catch (parseError) {
          results.push({
            callId: request.callId,
            name: request.name,
            result: null,
            error: `Invalid arguments format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            success: false,
          });
          continue;
        }

        // Execute the tool
        const executionResult = await this.toolExecutor.execute({
          tool: request.name,
          input: parsedArguments,
          requestId: request.callId,
          context: request.context ? {
            workspaceId: request.context.workspaceId,
            userId: request.context.userId,
            traceId: request.context.traceId,
            sessionId: request.context.sessionId,
            metadata: {
              conversationId: request.context.conversationId,
              source: "tool_call_handler"
            }
          } : undefined
        });

        results.push({
          callId: request.callId,
          name: request.name,
          result: executionResult.data,
          error: executionResult.error,
          success: executionResult.success,
        });

      } catch (error) {
        results.push({
          callId: request.callId,
          name: request.name,
          result: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    return results;
  }

  getAvailableTools() {
    return this.toolRegistry.definitions();
  }
}