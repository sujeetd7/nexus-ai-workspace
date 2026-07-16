import { ToolRegistry } from "../../tools/registry/tool-registry";
import { ToolExecutor } from "../../tools/runtime/tool-executor";

export interface ToolExecutionRequest {
  name: string;
  arguments: string;
  callId: string;
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
    private readonly toolExecutor: ToolExecutor
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