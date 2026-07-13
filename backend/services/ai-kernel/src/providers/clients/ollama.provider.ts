import { ILLMProvider } from "../interfaces/llm-provider.interface";
import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "../provider.interface";

export class OllamaProvider implements ILLMProvider {
  readonly name = "ollama";

  async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    return {
      text: "Mock response",
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: "stop",
    };
  }
}
