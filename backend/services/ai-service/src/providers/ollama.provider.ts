import axios from "axios";

import { ExecuteAIDto } from "../dto/execute-ai.dto";
import { StreamEventDto, StreamEventType } from "../dto/stream-event.dto";

import { retry } from "../utils/retry";

import { EmbedAIDto } from "../dto/embed-ai.dto";
import { EmbedResponseDto } from "../dto/embed-response.dto";
import { ProviderErrorHandler } from "./provider-error-handler";
import { AIExecutionResult, AIProvider } from "./provider.interface";

export class OllamaProvider implements AIProvider {
  async execute(request: ExecuteAIDto): Promise<AIExecutionResult> {
    const started = Date.now();
    try {
      return retry(async () => {
        const { data } = await axios.post(
          `${process.env.OLLAMA_BASE_URL}/api/generate`,
          {
            model: request.model ?? process.env.DEFAULT_MODEL,

            prompt: request.prompt,

            stream: false,
          },
          {
            timeout: 60000,
          },
        );

        return {
          text: data.response,

          promptTokens: data.prompt_eval_count ?? 0,

          completionTokens: data.eval_count ?? 0,

          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),

          durationMs: Date.now() - started,

          provider: "ollama",

          model: request.model ?? process.env.DEFAULT_MODEL ?? "unknown",
        };
      });
    } catch (error) {
      ProviderErrorHandler.handle("ollama", error);
    }
  }

  async *stream(request: ExecuteAIDto): AsyncGenerator<StreamEventDto> {
    try {
      const response = await axios.post(
        `${process.env.OLLAMA_BASE_URL}/api/generate`,
        {
          model: request.model ?? process.env.DEFAULT_MODEL,

          prompt: request.prompt,

          stream: true,
        },
        {
          responseType: "stream",
        },
      );

      for await (const chunk of response.data) {
        const lines = chunk.toString().split("\n").filter(Boolean);

        for (const line of lines) {
          const json = JSON.parse(line);

          if (json.response) {
            yield {
              type: StreamEventType.TOKEN,

              content: json.response,
            };
          }

          if (json.done) {
            yield {
              type: StreamEventType.DONE,
            };
          }
        }
      }
    } catch (error) {
      ProviderErrorHandler.handle("ollama", error);
    }
  }

  async embed(request: EmbedAIDto): Promise<EmbedResponseDto> {
    try {
      const { data } = await axios.post(
        `${process.env.OLLAMA_BASE_URL}/api/embed`,
        {
          model: request.model ?? process.env.OLLAMA_EMBEDDING_MODEL,

          input: Array.isArray(request.input) ? request.input : [request.input],
        },
        {
          timeout: 60000,
        },
      );

      return {
        provider: "ollama",

        model: request.model ?? process.env.OLLAMA_EMBEDDING_MODEL!,

        dimensions: data.embeddings?.[0]?.length ?? 0,

        embeddings: data.embeddings ?? [],
      };
    } catch (error) {
      ProviderErrorHandler.handle("ollama", error);
    }
  }

  async health(): Promise<boolean> {
    try {
      await axios.get(`${process.env.OLLAMA_BASE_URL}/api/tags`);

      return true;
    } catch (error) {
      ProviderErrorHandler.handle("ollama", error);
    }
  }
}
