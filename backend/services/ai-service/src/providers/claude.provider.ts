import Anthropic from "@anthropic-ai/sdk";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";
import { ProviderError } from "../errors/provider.error";
import { ProviderErrorHandler } from "./provider-error-handler";
import { AIExecutionResult, AIProvider } from "./provider.interface";

export class ClaudeProvider implements AIProvider {
  private client?: Anthropic;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY!,
      });
    }

    return this.client;
  }

  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    try {
      const started = Date.now();

      const messageRequest: any = {
        model: request.model!,
        max_tokens: request.maxTokens || 4096,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature: request.temperature ?? 0.7,
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        messageRequest.tools = request.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters,
        }));
      }

      const response = await this.getClient().messages.create(messageRequest);

      // Extract text content
      const textContent = response.content
        .filter((c) => c.type === "text")
        .map((c) => (c as any).text)
        .join("");

      // Extract tool calls
      const toolCalls = response.content
        .filter((c) => c.type === "tool_use")
        .map((c: any, index: number) => ({
          id: c.id || `call_${index}`,
          type: "function" as const,
          function: {
            name: c.name,
            arguments: JSON.stringify(c.input),
          },
        }));

      return {
        text: textContent,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        durationMs: Date.now() - started,
        provider: "claude",
        model: request.model!,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: response.stop_reason || "stop",
      };
    } catch (error) {
      ProviderErrorHandler.handle("claude", error);
    }
  }

  async embed(request: EmbedAIDto): Promise<EmbedResponseDto> {
    throw new ProviderError(
      "claude",
      501,
      "embedding_not_supported",
      "Anthropic does not currently support embedding generation.",
    );
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    try {
      const stream = await this.getClient().messages.stream({
        model: request.model!,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield {
            type: StreamEventType.DONE,
            content: event.delta.text,
          };
        }
      }

      yield {
        type: StreamEventType.DONE,
        content: "",
      };
    } catch (error) {
      ProviderErrorHandler.handle("claude", error);
    }
  }

  async health(): Promise<boolean> {
    try {
      await this.getClient().models.list();
      return true;
    } catch (error) {
      ProviderErrorHandler.handle("claude", error);
    }
  }
}
