import axios, { AxiosInstance } from "axios";
import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  HealthStatus,
  StreamChunk,
} from "../../providers/provider.interface";
import {
  AIServiceClientOptions,
  IAIServiceClient,
} from "./ai-service.interface";

export class AIServiceClient implements IAIServiceClient {
  private readonly client: AxiosInstance;

  constructor(private readonly opts: AIServiceClientOptions) {
    this.client = axios.create({
      baseURL: opts.url,
      timeout: opts.timeoutMs ?? 30_000,
      headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
    });
  }

  public async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    // Basic retry loop for transient failures
    const maxAttempts = 3;
    let lastErr: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await this.client.post("/api/v1/execute", request);
        const data = resp.data as {
          text: string;
          promptTokens?: number;
          completionTokens?: number;
          totalTokens?: number;
        };

        return {
          text: data.text,
          finishReason: "stop",
          usage: {
            promptTokens: data.promptTokens ?? 0,
            completionTokens: data.completionTokens ?? 0,
            totalTokens: data.totalTokens ?? 0,
          },
          raw: resp.data,
        };
      } catch (err) {
        lastErr = err;
        // simple backoff
        await new Promise((res) => setTimeout(res, attempt * 200));
      }
    }

    throw lastErr;
  }

  public async *streamExecute(
    request: ProviderExecuteRequest,
  ): AsyncIterable<ProviderExecuteResponse> {
    // connect to AI-Service stream endpoint and yield JSON events
    const resp = await this.client.post("/api/v1/stream", request, {
      responseType: "stream",
    });

    const stream = resp.data as NodeJS.ReadableStream;

    const reader = stream;

    let buffer = "";

    for await (const chunk of reader as any) {
      buffer += chunk.toString();

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);

        // Each event sent as a JSON line
        if (!raw) continue;

        try {
          const parsed = JSON.parse(raw) as ProviderExecuteResponse;
          yield parsed;
        } catch (err) {
          // ignore parse errors
        }
      }
    }
  }

  public async embed(payload: { input: string[]; model?: string }) {
    const resp = await this.client.post("/api/v1/embed", payload);
    return resp.data as { embeddings: number[][] };
  }

  public async generate(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    return this.execute(request);
  }

  public async *stream(
    request: ProviderExecuteRequest,
  ): AsyncIterable<StreamChunk> {
    const resp = await this.client.post("/api/v1/stream", request, {
      responseType: "stream",
      headers: {
        Accept: "text/event-stream",
      },
    });

    let buffer = "";
    const decoder = new TextDecoder();

    for await (const chunk of resp.data) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim().startsWith("data: ")) {
          const data = line.trim().substring(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            yield {
              text: parsed.content || parsed.text || "",
              finishReason: parsed.finishReason,
              usage: parsed.usage,
            };
          } catch (error) {
            // Ignore parse errors
            console.warn("Failed to parse stream chunk:", error);
          }
        }
      }
    }
  }

  public async embeddings(
    request: EmbeddingRequest,
  ): Promise<EmbeddingResponse> {
    const payload = {
      input: request.input,
      model: request.model,
      provider: "ollama",
    };

    const resp = await this.client.post("/api/v1/embeddings", payload);

    return {
      embeddings: resp.data.embeddings || [],
      usage: resp.data.usage || {
        promptTokens: 0,
        totalTokens: 0,
      },
    };
  }

  public async health(): Promise<HealthStatus> {
    try {
      const resp = await this.client.get("/api/v1/health");
      return {
        status: resp.status === 200 ? "healthy" : "unhealthy",
        latency: 0, // Could be measured
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  public async getAvailableProviders(): Promise<string[]> {
    try {
      const resp = await this.client.get("/api/v1/providers");
      return resp.data.providers || [];
    } catch (error) {
      console.warn("Failed to get available providers:", error);
      return [];
    }
  }

  public async providerHealth(provider: string): Promise<HealthStatus> {
    try {
      const resp = await this.client.get(
        `/api/v1/provider-health?provider=${provider}`,
      );

      if (resp.data.status) {
        return {
          status: resp.data.status,
          latency: resp.data.latency,
          error: resp.data.error,
        };
      } else {
        // Legacy format
        return {
          status: resp.data.healthy ? "healthy" : "unhealthy",
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
