import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "../provider.interface";

export class OllamaProvider implements ILLMProvider {
  readonly name = "ollama";

  private readonly baseUrl =
    process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

  public async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed (${response.status}) ${response.statusText}`,
      );
    }

    const data = await response.json();

    const message = data.message;

    return {
      text: message.content ?? "",

      toolCalls: message.tool_calls ?? [],

      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      },

      finishReason: "stop",

      raw: data,
    };
  }
}
