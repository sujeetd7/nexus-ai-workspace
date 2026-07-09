import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";
import { ProviderErrorHandler } from "./provider-error-handler";
import { AIExecutionResult, AIProvider } from "./provider.interface";

export class MockProvider implements AIProvider {
  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    try {
      return {
        text: `Mock Response : ${request.prompt}`,
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
        durationMs: 100,
        provider: "mock",
        model: "mock",
      };
    } catch (error) {
      ProviderErrorHandler.handle("mock", error);
    }
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    const words = "Mock streaming response".split(" ");

    for (const word of words) {
      yield {
        type: StreamEventType.TOKEN,
        content: word + " ",
      };

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    yield {
      type: StreamEventType.DONE,
    };
  }

  async embed(request: EmbedAIDto): Promise<EmbedResponseDto> {
    try {
      const inputs = Array.isArray(request.input)
        ? request.input
        : [request.input];

      const embeddings = inputs.map(() => [0]);

      return {
        provider: "mock",
        model: request.model ?? "mock",
        dimensions: 1,
        embeddings,
      };
    } catch (error) {
      ProviderErrorHandler.handle("mock", error);
    }
  }

  async health(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      ProviderErrorHandler.handle("mock", error);
    }
  }
}
