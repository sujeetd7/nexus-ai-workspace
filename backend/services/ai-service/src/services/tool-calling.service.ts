import { ExecuteAIDto, ToolCall, ToolDefinition } from "../dto/execute-ai.dto";
import { AIExecutionResult } from "../providers/provider.interface";
import { AIProvider } from "../providers/provider.interface";
import { ProviderRegistry } from "../providers/provider.registry";

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

export class ToolCallingService {
  constructor(private toolHandler?: ToolCallHandler) {}

  async executeWithTools(request: ExecuteAIDto): Promise<AIExecutionResult> {
    const provider = ProviderRegistry.get(request.provider || "ollama");
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found`);
    }

    let currentPrompt = request.prompt;
    let toolExecutionCount = 0;
    const maxToolExecutions = 5; // Prevent infinite loops
    
    while (toolExecutionCount < maxToolExecutions) {
      // Execute AI request with current prompt and tools
      const aiResult = await provider.execute({
        ...request,
        prompt: currentPrompt,
      });

      // Check if AI requested tool calls
      if (!aiResult.toolCalls || aiResult.toolCalls.length === 0) {
        // No more tool calls, return final result
        return aiResult;
      }

      // Execute requested tools
      const toolResults = await this.executeToolCalls(aiResult.toolCalls);
      
      // Build new prompt with tool results
      currentPrompt = this.buildPromptWithToolResults(
        currentPrompt, 
        aiResult.toolCalls, 
        toolResults
      );

      toolExecutionCount++;
      
      // If this is the last iteration, execute one final AI call
      if (toolExecutionCount >= maxToolExecutions) {
        return provider.execute({
          ...request,
          prompt: currentPrompt,
          tools: [], // Remove tools to prevent further calls
        });
      }
    }

    // Fallback (should not reach here)
    return provider.execute(request);
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolExecutionResult[]> {
    if (!this.toolHandler) {
      return toolCalls.map(call => ({
        callId: call.id,
        name: call.function.name,
        result: "Tool execution not available",
        error: "No tool handler configured",
        success: false,
      }));
    }

    const requests: ToolExecutionRequest[] = toolCalls.map(call => ({
      name: call.function.name,
      arguments: call.function.arguments,
      callId: call.id,
    }));

    return this.toolHandler.executeTools(requests);
  }

  private buildPromptWithToolResults(
    originalPrompt: string,
    toolCalls: ToolCall[],
    toolResults: ToolExecutionResult[]
  ): string {
    let updatedPrompt = originalPrompt;

    // Add assistant's tool calls
    updatedPrompt += "\n\nAssistant requested tools:";
    for (const call of toolCalls) {
      updatedPrompt += `\n- ${call.function.name}(${call.function.arguments})`;
    }

    // Add tool results
    updatedPrompt += "\n\nTool execution results:";
    for (const result of toolResults) {
      if (result.success) {
        updatedPrompt += `\n- ${result.name}: ${JSON.stringify(result.result)}`;
      } else {
        updatedPrompt += `\n- ${result.name}: ERROR - ${result.error}`;
      }
    }

    updatedPrompt += "\n\nPlease provide a final response based on the tool results above.";

    return updatedPrompt;
  }

  public async *streamWithTools(request: ExecuteAIDto): AsyncGenerator<any> {
    // For streaming, we need to handle tool calls differently
    // This is a simplified implementation - full implementation would need
    // to pause streaming, execute tools, and resume
    
    const provider = ProviderRegistry.get(request.provider || "ollama");
    if (!provider) {
      throw new Error(`Provider ${request.provider} not found`);
    }

    // For now, if tools are present, fall back to non-streaming
    if (request.tools && request.tools.length > 0) {
      const result = await this.executeWithTools(request);
      yield {
        type: "content",
        content: result.text,
      };
      yield {
        type: "done",
        data: result,
      };
    } else {
      // No tools, use regular streaming
      yield* provider.stream(request);
    }
  }
}