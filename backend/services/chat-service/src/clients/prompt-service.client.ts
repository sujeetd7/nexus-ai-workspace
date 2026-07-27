import axios, { AxiosError } from "axios";

import { ChatServiceError } from "../errors/chat-service.error";

export interface PromptExecuteDirectRequest {
  prompt: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  variables?: Record<string, unknown>;
  workspaceId?: string;
  userId?: string;
}

export interface PromptExecuteRequest {
  promptVersionId: string;
  provider?: string;
  model?: string;
  input: Record<string, unknown>;
}

export interface PromptExecutePublishedRequest {
  promptId: string;
  variables: Record<string, unknown>;
}

export interface PromptExecuteResponse {
  text: string;
  totalTokens: number;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  provider?: string;
  model?: string;
}

/**
 * HTTP client for Prompt Service — Chat must call Prompt, never AI Service directly.
 */
export class PromptServiceHttpClient {
  private readonly timeout = 60_000;

  private baseUrl(): string {
    const url = (process.env.PROMPT_SERVICE_URL ?? "").replace(/\/$/, "");
    if (!url) {
      throw new ChatServiceError(
        "PROMPT_SERVICE_URL is not configured. Set it to the base URL of the Prompt service " +
          "(e.g. http://localhost:3005).",
      );
    }
    return url;
  }

  private endpoint(path: string): string {
    const base = this.baseUrl();
    if (base.endsWith("/api/v1")) {
      return `${base}${path}`;
    }
    return `${base}/api/v1${path}`;
  }

  private headers(opts?: {
    workspaceId?: string;
    userId?: string;
    correlationId?: string;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (opts?.workspaceId) {
      headers["x-workspace-id"] = opts.workspaceId;
    }
    if (opts?.userId) {
      headers["x-user-id"] = opts.userId;
    }
    if (opts?.correlationId) {
      headers["x-correlation-id"] = opts.correlationId;
    }
    return headers;
  }

  private normalizeError(err: unknown, action: string): never {
    const axiosErr = err as AxiosError;
    if (axiosErr.code === "ECONNABORTED") {
      throw new ChatServiceError(
        `Prompt service timed out during ${action}`,
        axiosErr,
      );
    }
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const body = axiosErr.response.data as
        | { message?: string; error?: string }
        | undefined;
      const upstream =
        body?.message ?? body?.error ?? axiosErr.response.statusText;
      throw new ChatServiceError(
        `Prompt service returned ${status}: ${upstream}`,
        axiosErr,
      );
    }
    if (axiosErr.request) {
      throw new ChatServiceError(
        `Prompt service unreachable during ${action}`,
        axiosErr,
      );
    }
    throw new ChatServiceError(
      `Prompt service request failed: ${(err as Error).message}`,
      err,
    );
  }

  async executeDirect(
    request: PromptExecuteDirectRequest,
    opts?: { correlationId?: string },
  ): Promise<PromptExecuteResponse> {
    try {
      const { data } = await axios.post<PromptExecuteResponse>(
        this.endpoint("/prompts/execute-direct"),
        request,
        {
          timeout: this.timeout,
          headers: this.headers({
            workspaceId: request.workspaceId,
            userId: request.userId,
            correlationId: opts?.correlationId,
          }),
        },
      );
      return data;
    } catch (err) {
      this.normalizeError(err, "execute-direct");
    }
  }

  async execute(
    request: PromptExecuteRequest,
    opts?: {
      workspaceId?: string;
      userId?: string;
      correlationId?: string;
    },
  ): Promise<PromptExecuteResponse> {
    try {
      const { data } = await axios.post<PromptExecuteResponse>(
        this.endpoint("/prompts/execute"),
        request,
        {
          timeout: this.timeout,
          headers: this.headers(opts),
        },
      );
      return data;
    } catch (err) {
      this.normalizeError(err, "execute");
    }
  }

  async executePublished(
    request: PromptExecutePublishedRequest,
    opts?: {
      workspaceId?: string;
      userId?: string;
      correlationId?: string;
    },
  ): Promise<PromptExecuteResponse> {
    try {
      const { data } = await axios.post<PromptExecuteResponse>(
        this.endpoint("/prompts/execute-published"),
        request,
        {
          timeout: this.timeout,
          headers: this.headers(opts),
        },
      );
      return data;
    } catch (err) {
      this.normalizeError(err, "execute-published");
    }
  }
}
