import axios, { AxiosInstance } from "axios";
import { createHash } from "crypto";
import { PromptDto } from "./dto/prompt.dto";
import { RenderPromptResponse } from "./dto/render-prompt.response";

class PromptNotFoundError extends Error {
  public status: number;
  constructor(message: string) {
    super(message);
    this.name = "PromptNotFoundError";
    this.status = 404;
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class PromptServiceClient {
  private axios: AxiosInstance;
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries = 100;
  private ttlMs = 10 * 60 * 1000; // 10 minutes
  private retries = 3;

  // simple metrics
  public metrics = {
    cacheHit: 0,
    cacheMiss: 0,
    failures: 0,
    requests: 0,
  };

  constructor(baseUrl?: string, timeoutMs = 5000) {
    const url =
      baseUrl || process.env.PROMPT_SERVICE_URL || "http://localhost:3008";

    this.axios = axios.create({
      baseURL: url,
      timeout: timeoutMs,
    });
  }

  // Simple template compiler compatible with Prompt Service's PromptCompiler
  private compileTemplate(
    template: string,
    variables: Record<string, any>,
  ): string {
    const regex = /\{\{(.*?)\}\}/g;
    return template.replace(regex, (_, key: string) => {
      const value = variables[key.trim()];
      return value === undefined || value === null
        ? `{{${key}}}`
        : String(value);
    });
  }

  private makeCacheKey(parts: any[]): string {
    const str = parts
      .map((p) => (typeof p === "string" ? p : JSON.stringify(p)))
      .join("|");
    return createHash("sha256").update(str).digest("hex");
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // LRU: move to end by re-setting
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as T;
  }

  private setCache<T>(key: string, value: T) {
    if (this.cache.size >= this.maxEntries) {
      // remove oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  private async requestWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: any = null;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastErr = err;
        // If 404, don't retry
        if (err?.response?.status === 404) break;
        // Retry on network/5xx
      }
    }
    throw lastErr;
  }

  public async health(): Promise<boolean> {
    try {
      const res = await this.axios.get(`/api/v1/prompts`);
      return res.status === 200;
    } catch (err) {
      return false;
    }
  }

  public async getPrompt(id: string): Promise<PromptDto | null> {
    try {
      const res = await this.requestWithRetry(() =>
        this.axios.get(`/api/v1/prompts/${id}`),
      );
      return res.data as PromptDto;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  }

  public async getPromptByKey(
    key: string,
    workspaceId?: string,
  ): Promise<PromptDto | null> {
    try {
      const cacheKey = `prompt_meta:${key}`;
      const cached = this.getFromCache<PromptDto>(cacheKey);
      if (cached) {
        this.metrics.cacheHit++;
        return cached;
      }

      this.metrics.cacheMiss++;
      const res = await this.requestWithRetry(() =>
        this.axios.get(`/api/v1/prompts`, { params: { search: key } }),
      );
      const list = res.data as PromptDto[];

      // Prefer exact name match in the requested workspace that has a published/non-empty version,
      // then any exact name match with a published/non-empty version, then exact workspace/name matches,
      // then fallback to first item.
      const candidates = list.filter((p) => (p as any).name === key);

      const inWorkspace = workspaceId
        ? candidates.filter((p) => (p as any).workspaceId === workspaceId)
        : candidates;

      const hasGoodVersion = (p: any) =>
        (p.versions ?? []).some(
          (v: any) => v && (v.isPublished || v.userPrompt || v.systemPrompt),
        );

      const pick = (arr: any[]) => arr.find(hasGoodVersion) ?? arr[0];

      const found = pick(
        inWorkspace.length
          ? inWorkspace
          : candidates.length
            ? candidates
            : list,
      );

      if (!found) return null;

      this.setCache(cacheKey, found);
      return found;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      this.metrics.failures++;
      throw err;
    }
  }

  public async listPrompts(): Promise<PromptDto[]> {
    const res = await this.requestWithRetry(() =>
      this.axios.get(`/api/v1/prompts`),
    );
    return res.data as PromptDto[];
  }

  public async getPromptVersions(id: string): Promise<any[]> {
    const res = await this.requestWithRetry(() =>
      this.axios.get(`/api/v1/prompts/${id}`),
    );
    return res.data?.versions ?? [];
  }

  public async renderPrompt(
    keyOrId: string,
    variables: Record<string, any> = {},
    opts?: { promptVersion?: string; workspaceId?: string },
  ): Promise<RenderPromptResponse> {
    this.metrics.requests++;

    const cacheKey = this.makeCacheKey([
      "render",
      keyOrId,
      opts?.promptVersion || "",
      opts?.workspaceId || "",
      variables || {},
    ]);
    const cached = this.getFromCache<RenderPromptResponse>(cacheKey);
    if (cached) {
      this.metrics.cacheHit++;
      return cached;
    }

    this.metrics.cacheMiss++;

    try {
      // Resolve prompt by key or id
      let prompt = await this.getPromptByKey(keyOrId, opts?.workspaceId);

      // Only attempt to fetch by id if the key looks like a UUID to avoid hitting the wrong endpoint
      const looksLikeUuid = /^[0-9a-fA-F-]{36}$/.test(keyOrId);
      if (!prompt && looksLikeUuid) {
        prompt = await this.getPrompt(keyOrId);
      }

      if (!prompt) {
        throw new PromptNotFoundError(`Prompt not found: ${keyOrId}`);
      }

      // Find target version
      const versions = (prompt as any).versions ?? [];

      let versionObj: any | undefined;

      if (opts?.promptVersion) {
        versionObj = versions.find(
          (v: any) => String(v.version) === String(opts.promptVersion),
        );
      } else {
        // prefer published
        versionObj =
          versions.find((v: any) => v.isPublished) ??
          versions[versions.length - 1];
      }

      if (!versionObj) {
        throw new PromptNotFoundError(
          `Prompt version not found for: ${keyOrId}`,
        );
      }

      const systemPrompt = this.compileTemplate(
        versionObj.systemPrompt ?? "",
        variables,
      );
      const userPrompt = this.compileTemplate(
        versionObj.userPrompt ?? "",
        variables,
      );

      const rendered = `${systemPrompt}\n\n${userPrompt}`.trim();

      const dto: RenderPromptResponse = {
        rendered,
        version: versionObj.version,
      };

      this.setCache(cacheKey, dto);

      return dto;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new PromptNotFoundError(`Prompt not found: ${keyOrId}`);
      }
      this.metrics.failures++;
      throw err;
    }
  }
}

export default PromptServiceClient;
