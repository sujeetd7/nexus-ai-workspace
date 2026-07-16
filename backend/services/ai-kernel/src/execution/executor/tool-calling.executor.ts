import { IExecutionExecutor } from "./executor.interface";
import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { AIServiceClient } from "../../integrations/ai-service/ai-service.client";
import { KernelToolCallHandler } from "../../integrations/tools/tool-call-handler";
import { ToolRegistry } from "../../tools/registry/tool-registry";
import { EnhancedToolExecutor } from "../../tools/runtime/enhanced-tool-executor";

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallExecuteRequest {
  workspaceId: string;
  userId: string;
  provider: string;
  model: string;
  prompt: string;
  tools?: any[];
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

export class ToolCallingExecutor implements IExecutionExecutor {
  constructor(
    private readonly aiServiceClient: AIServiceClient,
    private readonly toolRegistry: ToolRegistry,
    private readonly toolExecutor: EnhancedToolExecutor
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Get available tools
      const availableTools = this.toolRegistry.definitions();
      
      // Create tool call handler
      const toolCallHandler = new KernelToolCallHandler(
        this.toolRegistry,
        this.toolExecutor
      );

      // Execute with tools using iterative approach
      const result = await this.executeWithToolCalling({
        workspaceId: context.kernelContext.workspaceId || "",
        userId: context.kernelContext.userId || "",
        provider: context.plan.provider,
        model: context.plan.model,
        prompt: context.kernelContext.compiledPrompt || context.kernelContext.prompt || "",
        tools: availableTools,
        temperature: context.plan.temperature,
        maxTokens: context.plan.maxTokens,
        stream: false,
      }, toolCallHandler, context);

      return ExecutionResult.builder(context.requestId)
        .setSuccess(true)
        .setOutput(result.text)
        .setTokens(result.totalTokens || 0)
        .setLatencyMs(Date.now() - startTime)
        .setFinishReason(result.finishReason || "completed")
        .setProviderMetadata({
          provider: result.provider || context.plan.provider,
          model: result.model || context.plan.model,
          toolCalls: result.toolCalls,
        })
        .build();

    } catch (error) {
      return ExecutionResult.builder(context.requestId)
        .setSuccess(false)
        .setError(error instanceof Error ? error : new Error("Unknown tool calling error"))
        .setLatencyMs(Date.now() - startTime)
        .build();
    }
  }

  private async executeWithToolCalling(
    request: ToolCallExecuteRequest,
    toolCallHandler: KernelToolCallHandler,
    context?: ExecutionContext
  ): Promise<any> {
    let currentPrompt = request.prompt;
    let toolExecutionCount = 0;
    const maxToolExecutions = 5; // Prevent infinite loops
    
    while (toolExecutionCount < maxToolExecutions) {
      // Execute AI request with current prompt and tools
      const aiResult = await this.aiServiceClient.execute({
        provider: request.provider,
        model: request.model,
        prompt: currentPrompt,
        tools: request.tools,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stream: false,
      });

      // Check if AI requested tool calls  
      const toolCalls = aiResult.toolCalls || (aiResult.raw as any)?.toolCalls;
      if (!toolCalls || toolCalls.length === 0) {
        // No more tool calls, return final result
        return {
          text: aiResult.text,
          provider: request.provider,
          model: request.model,
          promptTokens: aiResult.usage?.promptTokens || 0,
          completionTokens: aiResult.usage?.completionTokens || 0,
          totalTokens: aiResult.usage?.totalTokens || 0,
          finishReason: aiResult.finishReason,
          toolCalls: undefined,
        };
      }

      // Execute requested tools
      const toolResults = await toolCallHandler.executeTools(
        toolCalls.map((call: ToolCall) => ({
          name: call.function.name,
          arguments: call.function.arguments,
          callId: call.id,
          context: context ? {
            workspaceId: context.kernelContext.workspaceId,
            userId: context.kernelContext.userId,
            traceId: context.traceId,
            sessionId: context.payload.request?.sessionId,
            conversationId: context.kernelContext.conversationId,
          } : undefined,
        }))
      );
      
      // Build new prompt with tool results
      currentPrompt = this.buildPromptWithToolResults(
        currentPrompt, 
        toolCalls, 
        toolResults
      );

      toolExecutionCount++;
      
      // If this is the last iteration, execute one final AI call
      if (toolExecutionCount >= maxToolExecutions) {
        const finalResult = await this.aiServiceClient.execute({
          provider: request.provider,
          model: request.model,
          prompt: currentPrompt,
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          stream: false,
          // Remove tools to prevent further calls
        });

        return {
          text: finalResult.text,
          provider: request.provider,
          model: request.model,
          promptTokens: finalResult.usage?.promptTokens || 0,
          completionTokens: finalResult.usage?.completionTokens || 0,
          totalTokens: finalResult.usage?.totalTokens || 0,
          finishReason: finalResult.finishReason,
          toolCalls: undefined,
        };
      }
    }

    // Fallback (should not reach here)
    const fallbackResult = await this.aiServiceClient.execute({
      provider: request.provider,
      model: request.model,
      prompt: request.prompt,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      stream: request.stream,
    });
    return {
      text: fallbackResult.text,
      provider: request.provider,
      model: request.model,
      promptTokens: fallbackResult.usage?.promptTokens || 0,
      completionTokens: fallbackResult.usage?.completionTokens || 0,
      totalTokens: fallbackResult.usage?.totalTokens || 0,
      finishReason: fallbackResult.finishReason,
      toolCalls: undefined,
    };
  }

  private buildPromptWithToolResults(
    originalPrompt: string,
    toolCalls: ToolCall[],
    toolResults: any[]
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

  supports(step: any): boolean {
    return step.type === "tool_calling" || step.type === "execute";
  }
}