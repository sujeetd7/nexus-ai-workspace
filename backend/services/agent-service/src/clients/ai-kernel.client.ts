import axios from "axios";

import { KernelUnavailableError } from "../errors/kernel-unavailable-error";

export class AIKernelClient {
  private readonly client = axios.create({
    // AI Kernel default port: 3010 (Document Service owns 3004 — W3 port contract).
    // Override with AI_KERNEL_URL env var if the service runs on a different host/port.
    baseURL: process.env.AI_KERNEL_URL ?? "http://127.0.0.1:3010/api/v1",
    timeout: 60000,
  });

  async execute(payload: {
    provider: string;
    model: string;
    systemPrompt?: string | null;
    prompt: string;
    temperature?: number;
  }) {
    try {
      const started = Date.now();

      const response = await this.client.post("/kernel/execute", payload);

      if (typeof response.data === "undefined") {
        throw new Error("AI Kernel returned undefined response");
      }

      return {
        output: response.data,
        latency: Date.now() - started,
        tokens: response.data.totalTokens ?? response.data.tokens ?? 0,
      };
    } catch (error: any) {
      if (error instanceof KernelUnavailableError) {
        throw error;
      }

      if (error.code === "ECONNABORTED") {
        throw new KernelUnavailableError("AI Kernel request timed out");
      }

      if (error.response) {
        const status = error.response.status as number;
        if (status === 502 || status === 503 || status >= 500) {
          throw new KernelUnavailableError(
            `AI Kernel returned ${status}: upstream unavailable`,
          );
        }
        // Non-availability upstream errors — client-safe message only.
        throw new Error(`AI Kernel returned ${status}`);
      }

      if (error.request) {
        throw new KernelUnavailableError(
          "AI Kernel connection failed. No response received.",
        );
      }

      throw error;
    }
  }
}
