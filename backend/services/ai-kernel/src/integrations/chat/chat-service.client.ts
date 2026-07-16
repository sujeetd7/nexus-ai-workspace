import axios, { AxiosInstance } from "axios";

export interface ChatServiceClientOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export class ChatServiceClient {
  private readonly client: AxiosInstance;
  private readonly retries: number;

  constructor(private readonly opts: ChatServiceClientOptions) {
    this.client = axios.create({
      baseURL: opts.url,
      timeout: opts.timeoutMs ?? 60000,
      headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
    });

    this.retries = opts.retries ?? 3;
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        await new Promise((resolve) => setTimeout(resolve, attempt * 200));
      }
    }

    throw lastErr;
  }

  public async health(): Promise<boolean> {
    try {
      const resp = await this.client.get("/api/v1/");
      return resp.status === 200;
    } catch {
      return false;
    }
  }

  public async createConversation(payload: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.post("/api/v1/conversations", payload);
      return resp.data;
    });
  }

  public async getConversation(id: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/conversations/${id}`);
      return resp.data;
    });
  }

  public async listConversations(): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get("/api/v1/conversations");
      return resp.data;
    });
  }

  public async deleteConversation(id: string): Promise<void> {
    return this.withRetries(async () => {
      await this.client.delete(`/api/v1/conversations/${id}`);
    });
  }

  public async createMessage(conversationId: string, payload: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.post(`/api/v1/conversations/${conversationId}/messages`, payload);
      return resp.data;
    });
  }

  public async listMessages(conversationId: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/conversations/${conversationId}/messages`);
      return resp.data;
    });
  }
}