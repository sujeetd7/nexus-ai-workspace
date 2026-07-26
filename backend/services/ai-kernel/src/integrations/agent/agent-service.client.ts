import axios, { AxiosInstance } from "axios";

export interface AgentServiceClientOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export class AgentServiceClient {
  private readonly client: AxiosInstance;
  private readonly retries: number;

  constructor(private readonly opts: AgentServiceClientOptions) {
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

  public async createAgent(payload: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.post("/api/v1/agents", payload);
      return resp.data;
    });
  }

  public async listAgents(): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get("/api/v1/agents");
      return resp.data;
    });
  }

  public async getAgent(id: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/agents/${id}`);
      return resp.data;
    });
  }

  public async updateAgent(id: string, payload: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.put(`/api/v1/agents/${id}`, payload);
      return resp.data;
    });
  }

  public async deleteAgent(id: string): Promise<void> {
    return this.withRetries(async () => {
      await this.client.delete(`/api/v1/agents/${id}`);
    });
  }

  public async execute(payload: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.post("/api/v1/agents/execute", payload);
      return resp.data;
    });
  }

  public async listExecutions(): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get("/api/v1/agents/executions");
      return resp.data;
    });
  }

  public async listExecutionsByAgent(agentId: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(
        `/api/v1/agents/${agentId}/executions`,
      );
      return resp.data;
    });
  }

  public async getExecution(executionId: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(
        `/api/v1/agents/execution/${executionId}`,
      );
      return resp.data;
    });
  }
}
