import { GoogleGenAI } from "@google/genai";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { AIExecutionResult, AIProvider } from "./provider.interface";

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
    const started = Date.now();

    const response = await this.getClient().models.generateContent({
      model: request.model!,
      contents: request.prompt,
    });

    return {
      text: response.text ?? "",
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - started,
      provider: "gemini",
      model: request.model!,
    };
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    const stream = await this.getClient().models.generateContentStream({
      model: request.model!,
      contents: request.prompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield {
          type: StreamEventType.DONE,
          content: chunk.text,
        };
      }
    }

    yield {
      type: StreamEventType.DONE,
    };
  }

  async health(): Promise<boolean> {
    try {
      await this.getClient().models.list();
      return true;
    } catch {
      return false;
    }
  }
}
