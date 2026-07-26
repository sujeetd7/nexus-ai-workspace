import OpenAI from "openai";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";
import { ProviderErrorHandler } from "./provider-error-handler";
import { AIExecutionResult, AIProvider } from "./provider.interface";

export class OpenAIProvider implements AIProvider {
  private client?: OpenAI;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
    }
    return this.client;
  }
  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    try {
      const started = Date.now();

      const completionRequest: any = {
        model: request.model ?? process.env.OPENAI_MODEL!,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        completionRequest.tools = request.tools.map(tool => ({
          type: "function",
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          },
        }));
        completionRequest.tool_choice = "auto";
      }

      const response = await this.getClient().chat.completions.create(completionRequest);

      const choice = response.choices[0];
      const message = choice?.message;

      // Extract tool calls if present
      const toolCalls = message?.tool_calls?.map(call => ({
        id: call.id,
        type: "function" as const,
        function: {
          name: (call as any).function?.name || "",
          arguments: (call as any).function?.arguments || "{}",
        },
      }));

      return {
        text: message?.content ?? "",
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        durationMs: Date.now() - started,
        provider: "openai",
        model: request.model ?? process.env.OPENAI_MODEL!,
        toolCalls,
        finishReason: choice?.finish_reason ?? undefined,
      };
    } catch (error) {
      ProviderErrorHandler.handle("openai", error);
    }
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    try {
      const streamRequest: any = {
        model: request.model ?? process.env.OPENAI_MODEL!,
        stream: true,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        streamRequest.tools = request.tools.map(tool => ({
          type: "function",
          function: {
            name: tool.function.name,
            description: tool.function.description,
            parameters: tool.function.parameters,
          },
        }));
        streamRequest.tool_choice = "auto";
      }

      const stream = await this.getClient().chat.completions.create(streamRequest) as any;

      let toolCalls: any[] = [];
      let currentToolCall: any = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle content tokens
        if (delta?.content) {
          yield {
            type: StreamEventType.TOKEN,
            content: delta.content,
          };
        }

        // Handle tool calls
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              // Initialize or update tool call
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: toolCallDelta.id || "",
                  type: "function",
                  function: {
                    name: "",
                    arguments: "",
                  },
                };
              }

              const toolCall = toolCalls[toolCallDelta.index];
              
              if (toolCallDelta.function?.name) {
                toolCall.function.name += toolCallDelta.function.name;
              }
              if (toolCallDelta.function?.arguments) {
                toolCall.function.arguments += toolCallDelta.function.arguments;
              }
              if (toolCallDelta.id) {
                toolCall.id = toolCallDelta.id;
              }
            }
          }
        }

        // Check for completion
        if (chunk.choices[0]?.finish_reason) {
          if (toolCalls.length > 0) {
            yield {
              type: StreamEventType.TOOL_CALL,
              content: JSON.stringify(toolCalls),
            };
          }

          yield {
            type: StreamEventType.DONE,
          };
          break;
        }
      }
    } catch (error) {
      ProviderErrorHandler.handle("openai", error);
    }
  }

  async health(): Promise<boolean> {
    try {
      await this.getClient().models.list();
      return true;
    } catch (error) {
      ProviderErrorHandler.handle("openai", error);
    }
  }

  async embed(request: EmbedAIDto): Promise<EmbedResponseDto> {
    try {
      const response = await this.getClient().embeddings.create({
        model: request.model ?? process.env.OPENAI_EMBEDDING_MODEL!,
        input: request.input,
      });

      return {
        provider: "openai",

        model: response.model,

        dimensions: response.data[0].embedding.length,

        embeddings: response.data.map((item) => item.embedding),
      };
    } catch (error) {
      ProviderErrorHandler.handle("openai", error);
    }
  }
}
