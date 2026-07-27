import { GoogleGenAI } from "@google/genai";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { ProviderErrorHandler } from "./provider-error-handler";
import { AIExecutionResult, AIProvider } from "./provider.interface";

import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";

export class GeminiProvider implements AIProvider {
  private client?: GoogleGenAI;

  private getClient() {
    if (!this.client) {
      this.client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
      });
    }

    return this.client;
  }

  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    try {
      const started = Date.now();

      // For now, use simple API without tools (older version limitation)
      const response = await this.getClient().models.generateContent({
        model: request.model || "gemini-pro",
        contents: request.prompt,
      });

      return {
        text: response.text ?? "",
        promptTokens: 0, // Not available in older API
        completionTokens: 0,
        totalTokens: 0,
        durationMs: Date.now() - started,
        provider: "gemini",
        model: request.model || "gemini-pro",
        // Tool calls not supported in older API
        finishReason: "stop",
      };
    } catch (error) {
      ProviderErrorHandler.handle("gemini", error);
    }
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    try {
      const stream = await this.getClient().models.generateContentStream({
        model: request.model || "gemini-pro",
        contents: request.prompt,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield {
            type: StreamEventType.TOKEN,
            content: chunk.text,
          };
        }
      }

      yield {
        type: StreamEventType.DONE,
      };
    } catch (error) {
      ProviderErrorHandler.handle("gemini", error);
    }
  }

  async embed(request: EmbedAIDto): Promise<EmbedResponseDto> {
    try {
      const response = await this.getClient().models.embedContent({
        model: request.model ?? "embedding-001",
        contents: Array.isArray(request.input)
          ? request.input.join("\n")
          : request.input,
      });

      return {
        provider: "gemini",
        model: request.model ?? "embedding-001",
        dimensions: response.embeddings?.[0]?.values?.length ?? 0,
        embeddings: response.embeddings?.map((e) => e.values ?? []) ?? [],
      };
    } catch (error) {
      ProviderErrorHandler.handle("gemini", error);
    }
  }

  async health(): Promise<boolean> {
    try {
      await this.getClient().models.list();
      return true;
    } catch (error) {
      ProviderErrorHandler.handle("gemini", error);
    }
  }
}
