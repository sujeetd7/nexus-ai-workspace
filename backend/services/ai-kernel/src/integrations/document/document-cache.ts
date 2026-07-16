import type Redis from "ioredis";
let IORedis: typeof Redis | undefined;
try {
  // lazy require to avoid hard dependency at import time in environments without ioredis
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  IORedis = require("ioredis");
} catch (err) {
  IORedis = undefined;
}

type CacheValue = any;

export class MetadataCache {
  private redis: any | null = null;
  private local: Map<string, { value: CacheValue; expiresAt: number }> =
    new Map();

  constructor() {
    const url = process.env.REDIS_URL;
    if (url && IORedis) {
      this.redis = new IORedis(url);
      this.redis.on("error", (e: any) => console.warn("Redis error", e));
    }
  }

  private now() {
    return Date.now();
  }

  public async get(key: string): Promise<CacheValue | null> {
    if (this.redis) {
      try {
        const v = await this.redis.get(key);
        return v ? JSON.parse(v) : null;
      } catch (err) {
        console.warn("Redis get failed", err);
        return null;
      }
    }

    const entry = this.local.get(key);
    if (!entry) return null;
    if (entry.expiresAt < this.now()) {
      this.local.delete(key);
      return null;
    }
    return entry.value;
  }

  public async set(
    key: string,
    value: CacheValue,
    ttlSec = 600,
  ): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), "EX", ttlSec);
        return;
      } catch (err) {
        console.warn("Redis set failed", err);
      }
    }

    this.local.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
  }

  public async del(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        console.warn("Redis del failed", err);
      }
    }

    this.local.delete(key);
  }
}

export const metadataCache = new MetadataCache();
