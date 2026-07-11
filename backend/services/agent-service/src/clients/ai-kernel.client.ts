import axios from "axios";

export class AIKernelClient {
  private readonly client = axios.create({
    baseURL: process.env.AI_KERNEL_URL ?? "http://localhost:3001/api/v1",
    timeout: 60000,
  });

  async execute(payload: {
    provider: string;
    model: string;
    systemPrompt?: string | null;
    prompt: string;
    temperature?: number;
  }) {
    const started = Date.now();

    const response = await this.client.post("/execute", payload);

    return {
      output: response.data,
      latency: Date.now() - started,
      tokens: response.data.totalTokens ?? response.data.tokens ?? 0,
    };
  }
}
