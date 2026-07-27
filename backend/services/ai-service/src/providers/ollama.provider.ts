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
        // Enhance prompt with tool information for Ollama
        let enhancedPrompt = request.prompt;

        if (request.tools && request.tools.length > 0) {
          enhancedPrompt = this.buildToolPrompt(request.prompt, request.tools);
        }

        const { data } = await axios.post(
          `${process.env.OLLAMA_BASE_URL}/api/generate`,
          {
            model: request.model ?? process.env.DEFAULT_MODEL,
            prompt: enhancedPrompt,
            stream: false,
            options: {
              temperature: request.temperature ?? 0.7,
              num_predict: request.maxTokens,
            },
          },
          {
            timeout: 60000,
          },
        );

        // Parse tool calls from response if tools were available
        const toolCalls = request.tools
          ? this.parseToolCalls(data.response)
          : undefined;

        return {
          text: data.response,
          promptTokens: data.prompt_eval_count ?? 0,
          completionTokens: data.eval_count ?? 0,
          totalTokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
          durationMs: Date.now() - started,
          provider: "ollama",
          model: request.model ?? process.env.DEFAULT_MODEL ?? "unknown",
          toolCalls,
          finishReason: "stop",
        };
      });
    } catch (error) {
      ProviderErrorHandler.handle("ollama", error);
    }
  }

  private buildToolPrompt(originalPrompt: string, tools: any[]): string {
    let prompt = originalPrompt;

    prompt += "\n\nYou have access to the following tools:";

    for (const tool of tools) {
      prompt += `\n\nTool: ${tool.function.name}`;
      prompt += `\nDescription: ${tool.function.description}`;
      prompt += `\nParameters: ${JSON.stringify(tool.function.parameters)}`;
    }

    prompt += "\n\nTo use a tool, respond with a JSON object in this format:";
    prompt +=
      '\n{"tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "tool_name", "arguments": "{\"param\": \"value\"}"}}]}';
    prompt += "\n\nIf you don't need to use any tools, respond normally.";

    return prompt;
  }

  private parseToolCalls(response: string): any[] | undefined {
    try {
      // Look for JSON tool call format
      const jsonMatch = response.match(/\{[\s\S]*"tool_calls"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.tool_calls;
      }
    } catch (error) {
      // Ignore parsing errors - no tool calls found
    }

    return undefined;
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
