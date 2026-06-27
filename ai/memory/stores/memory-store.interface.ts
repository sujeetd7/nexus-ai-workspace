/**
 * @module MemoryStoreInterfaces
 * @description Low-level storage adapter interfaces for AI memory backends.
 *
 * These are the adapter layer — they implement the Repository pattern and
 * abstract the physical storage from the memory domain layer.
 *
 * Supported backends: Redis, MongoDB, ChromaDB
 *
 * TODO: Implement RedisMemoryStore
 * TODO: Implement MongoDBMemoryStore
 * TODO: Implement ChromaDBMemoryStore
 */

// ---------------------------------------------------------------------------
// Base Memory Store
// ---------------------------------------------------------------------------

/**
 * Generic key-value memory store interface.
 * All memory adapters implement this interface.
 *
 * @template T - The type of value stored
 */
export interface MemoryStore<T = unknown> {
  /** Store type identifier */
  readonly storeType: "redis" | "mongodb" | "chromadb" | "in-memory";

  /** Connect to the backing store */
  connect(): Promise<void>;

  /** Gracefully disconnect */
  disconnect(): Promise<void>;

  /**
   * Get a value by key.
   * Returns null if not found or expired.
   */
  get(key: string): Promise<T | null>;

  /**
   * Set a value with optional TTL.
   * @param ttlSeconds - Time-to-live in seconds. Omit for no expiry.
   */
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /** Delete a key. Returns true if deleted, false if not found. */
  delete(key: string): Promise<boolean>;

  /** Check if a key exists and has not expired. */
  exists(key: string): Promise<boolean>;

  /**
   * Find all keys matching a pattern.
   * Pattern syntax is backend-specific (Redis: glob, MongoDB: regex).
   */
  keys(pattern: string): Promise<string[]>;

  /**
   * Delete all keys matching a pattern.
   * Returns the number of keys deleted.
   */
  flush(pattern?: string): Promise<number>;

  /** Check store health. */
  healthCheck(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Redis Store Interface
// ---------------------------------------------------------------------------

/** Configuration for Redis-backed memory store */
export interface RedisStoreConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  keyPrefix?: string;
  /** Default TTL in seconds for all keys. Default: 7200 (2 hours) */
  defaultTtl?: number;
  /** Connection pool size */
  maxConnections?: number;
}

/**
 * Redis-backed memory store.
 * Primary backend for short-term / working memory.
 *
 * TODO: Implement using ioredis
 */
export interface RedisMemoryStore extends MemoryStore {
  readonly storeType: "redis";

  /**
   * Atomically increment a counter.
   * Useful for token counting, rate limiting.
   */
  increment(key: string, by?: number): Promise<number>;

  /**
   * Push items to a Redis list (used for conversation turn storage).
   */
  listPush(key: string, ...values: string[]): Promise<number>;

  /**
   * Get a range of items from a Redis list.
   * listRange(key, 0, -1) returns all items.
   */
  listRange(key: string, start: number, stop: number): Promise<string[]>;

  /**
   * Trim a Redis list to the specified range.
   * Used to enforce conversation window limits.
   */
  listTrim(key: string, start: number, stop: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// MongoDB Store Interface
// ---------------------------------------------------------------------------

/** Configuration for MongoDB-backed memory store */
export interface MongoDBStoreConfig {
  uri: string;
  database: string;
  collection: string;
  /** Whether to create a TTL index on the `expiresAt` field. Default: true */
  enableTtlIndex?: boolean;
  /** Connection pool size. Default: 10 */
  maxPoolSize?: number;
}

/**
 * MongoDB-backed memory store.
 * Primary backend for long-term and episodic memory.
 *
 * TODO: Implement using official MongoDB Node.js driver or Mongoose
 */
export interface MongoDBMemoryStore extends MemoryStore {
  readonly storeType: "mongodb";

  /**
   * Full-text search across stored memory entries.
   * Requires a MongoDB text index on the value fields.
   */
  search(query: string, limit?: number): Promise<unknown[]>;

  /**
   * Query with MongoDB filter document.
   * For advanced filtered retrieval.
   */
  find(filter: Record<string, unknown>, limit?: number): Promise<unknown[]>;
}

// ---------------------------------------------------------------------------
// ChromaDB Store Interface
// ---------------------------------------------------------------------------

/** Configuration for ChromaDB-backed vector memory store */
export interface ChromaDBStoreConfig {
  host: string;
  port: number;
  collectionName: string;
  /** Embedding model to use for vector generation */
  embeddingModel: string;
  /** Similarity metric: cosine (default), l2, ip */
  distanceMetric?: "cosine" | "l2" | "ip";
}

/**
 * ChromaDB-backed vector memory store.
 * Primary backend for semantic memory.
 *
 * TODO: Implement using chromadb JavaScript client
 */
export interface ChromaDBMemoryStore extends MemoryStore {
  readonly storeType: "chromadb";

  /**
   * Semantic similarity search.
   * Returns top-K documents by embedding similarity.
   */
  similaritySearch(
    query: string,
    topK: number,
    filter?: Record<string, unknown>
  ): Promise<Array<{ id: string; content: string; score: number; metadata: Record<string, unknown> }>>;

  /** Upsert a document with its embedding */
  upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata?: Record<string, unknown>
  ): Promise<void>;
}
