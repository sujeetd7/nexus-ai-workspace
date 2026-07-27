import axios, { AxiosInstance } from "axios";

export interface WorkspaceServiceClientOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export class WorkspaceServiceClient {
  private readonly client: AxiosInstance;
  private readonly retries: number;

  constructor(private readonly opts: WorkspaceServiceClientOptions) {
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

  public async listWorkspaces(): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get("/api/v1/workspaces");
      return resp.data;
    });
  }

  public async getWorkspace(id: string): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/workspaces/${id}`);
      return resp.data;
    });
  }

  public async createWorkspace(data: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.post("/api/v1/workspaces", data);
      return resp.data;
    });
  }

  public async updateWorkspace(id: string, data: any): Promise<any> {
    return this.withRetries(async () => {
      const resp = await this.client.patch(`/api/v1/workspaces/${id}`, data);
      return resp.data;
    });
  }

  public async deleteWorkspace(id: string): Promise<void> {
    return this.withRetries(async () => {
      await this.client.delete(`/api/v1/workspaces/${id}`);
    });
  }
}
