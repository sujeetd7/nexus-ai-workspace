import axios, { AxiosError } from "axios";

export interface ExecutePromptRequest {
  provider: string;
  model?: string;
  prompt: string;
  systemPrompt?: string;
}

export interface ExecutePromptResponse {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  provider: string;
  model: string;
}

export class AIServiceClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIServiceClientError";
    Object.setPrototypeOf(this, AIServiceClientError.prototype);
  }
}

export class AIServiceClient {
  private readonly timeout = 60000;

  private getBaseUrl(): string {
    return (process.env.AI_SERVICE_URL ?? "").replace(/\/$/, "");
  }

  async execute(request: ExecutePromptRequest): Promise<ExecutePromptResponse> {
    const base = this.getBaseUrl();

    if (!base) {
      throw new AIServiceClientError(
        "AI_SERVICE_URL is not configured. Set the AI_SERVICE_URL environment variable " +
          "to the base URL of the AI service (e.g. http://localhost:3007).",
      );
    }

    const endpoint = base.endsWith("/api/v1")
      ? `${base}/execute`
      : `${base}/api/v1/execute`;

    try {
      const { data } = await axios.post<ExecutePromptResponse>(
        endpoint,
        request,
        { timeout: this.timeout },
      );

      return data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response) {
        throw new AIServiceClientError(
          `AI service returned ${axiosErr.response.status}: ${axiosErr.response.statusText}`,
          axiosErr,
        );
      }
      throw new AIServiceClientError(
        `AI service request failed: ${(err as Error).message}`,
        err,
      );
    }
  }
}
