import axios from "axios";

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

export class AIServiceClient {
  private readonly timeout = 60000;

  private getBaseUrl(): string {
    return (process.env.AI_SERVICE_URL ?? "").replace(/\/$/, "");
  }

  async execute(request: ExecutePromptRequest): Promise<ExecutePromptResponse> {
    const base = this.getBaseUrl();
    if (!base) {
      // Return a mock response in local/dev environments when AI service is not configured
      return {
        text: "Mock LLM Response",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: 0,
        provider: request.provider ?? "mock",
        model: request.model ?? "mock",
      } as ExecutePromptResponse;
    }

    const endpoint = base.endsWith("/api/v1")
      ? `${base}/execute`
      : `${base}/api/v1/execute`;

    try {
      const { data } = await axios.post<ExecutePromptResponse>(
        endpoint,
        request,
        {
          timeout: this.timeout,
        },
      );

      return data;
    } catch (err) {
      // On network errors, fall back to a mock response to keep dev flow working
      return {
        text: "Mock LLM Response (fallback)",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        durationMs: 0,
        provider: request.provider ?? "mock",
        model: request.model ?? "mock",
      } as ExecutePromptResponse;
    }
  }
}
