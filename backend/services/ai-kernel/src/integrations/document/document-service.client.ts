import axios, { AxiosInstance } from "axios";
// import { metadataCache } from "./document-cache";
import { DocumentSearchResultDTO } from "./document-search-result.dto";
import { DocumentDTO } from "./document.dto";
import { DocumentSearchRequestDTO } from "./search-document.dto";

export interface DocumentServiceClientOptions {
  url: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
}

export class DocumentServiceClient {
  private readonly client: AxiosInstance;
  private readonly retries: number;

  constructor(private readonly opts: DocumentServiceClientOptions) {
    this.client = axios.create({
      baseURL: opts.url,
      timeout: opts.timeoutMs ?? 5000,
      headers: opts.apiKey ? { Authorization: `Bearer ${opts.apiKey}` } : {},
    });

    this.retries = opts.retries ?? 3;
  }

  private async withRetries<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: any;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        // backoff
        await new Promise((r) => setTimeout(r, attempt * 200));
      }
    }
    throw lastErr;
  }

  public async upload(
    file: any,
    metadata?: Record<string, any>,
  ): Promise<DocumentDTO> {
    return this.withRetries(async () => {
      const form = new FormData();
      form.append("file", file);
      if (metadata) form.append("metadata", JSON.stringify(metadata));

      const resp = await this.client.post("/api/v1/documents", form, {
        headers: (form as any).getHeaders ? (form as any).getHeaders() : {},
      });

      const doc = resp.data as DocumentDTO;
      // cache the uploaded document metadata
      try {
        // await metadataCache.set(`document:${doc.id}`, doc, 600);
      } catch (err) {
        // ignore cache errors
      }

      return doc;
    });
  }

  public async getDocument(id: string): Promise<DocumentDTO> {
    // check cache first
    const cacheKey = `document:${id}`;
    try {
      // const cached = await metadataCache.get(cacheKey);
      const cached = null;
      if (cached) return cached as DocumentDTO;
    } catch (err) {
      // ignore cache errors
    }

    const doc = await this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/documents/${id}`);
      return resp.data as DocumentDTO;
    });

    try {
      // await metadataCache.set(cacheKey, doc, 600);
    } catch (err) {
      // ignore
    }

    return doc;
  }

  public async listDocuments(workspaceId?: string): Promise<DocumentDTO[]> {
    return this.withRetries(async () => {
      const resp = await this.client.get(`/api/v1/documents`, {
        params: { workspaceId },
      });
      return resp.data as DocumentDTO[];
    });
  }

  public async deleteDocument(id: string): Promise<void> {
    return this.withRetries(async () => {
      await this.client.delete(`/api/v1/documents/${id}`);
      try {
        // await metadataCache.del(`document:${id}`);
      } catch (err) {
        // ignore
      }
    });
  }

  public async search(
    req: DocumentSearchRequestDTO,
  ): Promise<DocumentSearchResultDTO> {
    return this.withRetries(async () => {
      const resp = await this.client.post(`/api/v1/documents/search`, req);
      return resp.data as DocumentSearchResultDTO;
    });
  }

  public async index(id: string): Promise<void> {
    return this.withRetries(async () => {
      await this.client.post(`/api/v1/documents/${id}/index`);
    });
  }

  public async reindex(): Promise<void> {
    return this.withRetries(async () => {
      await this.client.post(`/api/v1/documents/reindex`);
    });
  }

  public async workspaceDocuments(workspaceId: string): Promise<DocumentDTO[]> {
    return this.withRetries(async () => {
      const resp = await this.client.get(
        `/api/v1/workspaces/${workspaceId}/documents`,
      );
      return resp.data as DocumentDTO[];
    });
  }

  public async health(): Promise<boolean> {
    try {
      const resp = await this.client.get(`/health`);
      return resp.status === 200;
    } catch (err) {
      return false;
    }
  }
}
