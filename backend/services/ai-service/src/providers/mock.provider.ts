import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { AIExecutionResult, AIProvider } from "./provider.interface";

export class MockProvider implements AIProvider {
  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    return {
      text: `Mock Response : ${request.prompt}`,

      promptTokens: 10,

      completionTokens: 20,

      totalTokens: 30,

      durationMs: 100,

      provider: "mock",

      model: request.model ?? "mock",
    };
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    const words = `Mock streaming response for ${request.prompt}`.split(" ");

    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 150));

      yield {
        type: StreamEventType.TOKEN,

        content: word + " ",
      };
    }

    yield {
      type: StreamEventType.DONE,
    };
  }

  async health(): Promise<boolean> {
    return true;
  }
}
