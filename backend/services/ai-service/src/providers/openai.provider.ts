import OpenAI from "openai";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { EmbedAIDto } from "src/dto/embed-ai.dto";
import { EmbedResponseDto } from "src/dto/embed-response.dto";
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

      const response = await this.getClient().chat.completions.create({
        model: request.model ?? process.env.OPENAI_MODEL!,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      });

      return {
        text: response.choices[0]?.message?.content ?? "",
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        durationMs: Date.now() - started,
        provider: "openai",
        model: request.model ?? process.env.OPENAI_MODEL!,
      };
    } catch (error) {
      ProviderErrorHandler.handle("openai", error);
    }
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    try {
      const stream = await this.getClient().chat.completions.create({
        model: request.model ?? process.env.OPENAI_MODEL!,
        stream: true,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content;

        if (token) {
          yield {
            type: StreamEventType.TOKEN,
            content: token,
          };
        }
      }

      yield {
        type: StreamEventType.DONE,
      };
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
