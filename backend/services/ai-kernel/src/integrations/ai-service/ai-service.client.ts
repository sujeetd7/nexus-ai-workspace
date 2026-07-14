import axios, { AxiosInstance } from "axios";
import {
  ProviderExecuteRequest,
  ProviderExecuteResponse,
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

        // Expect the AI-Service to return the same shape as ProviderExecuteResponse
        return resp.data as ProviderExecuteResponse;
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
}
