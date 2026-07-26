/**
 * @module PersistentMemoryInterface
 * @description Long-term persistent memory interface for cross-session knowledge.
 *
 * Backed by MongoDB for rich querying, full-text search, and retention policy support.
 *
 * TODO: Implement MongoDBPersistentMemory adapter in stores/
 */

// ---------------------------------------------------------------------------
// Memory Entry
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  /** Unique identifier */
  id: string;

  /** Scoping key (e.g., "preference.language", "fact.user_name") */
  key: string;

  /** Stored value — can be any serializable type */
  value: unknown;

  /** Memory source */
  source: "user" | "agent" | "system";

  /** Importance score 0.0–1.0. Used for retention and retrieval ranking. */
  importance: number;

  /** Optional tags for categorization */
  tags?: string[];

  /** When this memory was created */
  createdAt: Date;

  /** When this memory was last updated */
  updatedAt: Date;

  /** Optional hard expiry timestamp */
  expiresAt?: Date;

  /** Number of times this memory has been retrieved */
  accessCount: number;

  /** Owner identifier (userId or agentId) */
  ownerId: string;
}

// ---------------------------------------------------------------------------
// Persistent Memory Interface
// ---------------------------------------------------------------------------

/**
 * Long-term memory for cross-session persistence of facts and preferences.
 *
 * All operations are scoped to a specific ownerId (user or agent).
 * Backed by MongoDB.
 */
export interface PersistentMemory {
  /** Owner of this memory scope */
  readonly ownerId: string;

  /**
   * Store a memory entry. Overwrites existing entry with the same key.
   */
  store(
    entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt" | "accessCount">,
  ): Promise<MemoryEntry>;

  /**
   * Retrieve a specific memory entry by key.
   * Returns null if not found or expired.
   */
  retrieve(key: string): Promise<MemoryEntry | null>;

  /**
   * Full-text search across memory values and tags.
   * Returns results ranked by relevance × importance.
   */
  search(query: string, limit?: number): Promise<MemoryEntry[]>;

  /**
   * Delete a specific memory entry by key.
   */
  delete(key: string): Promise<boolean>;

  /**
   * List all keys in this memory scope.
   */
  listKeys(prefix?: string): Promise<string[]>;

  /**
   * Prune low-importance or expired entries.
   * Called during maintenance cycles.
   */
  prune(): Promise<number>;

  /**
   * Export all memory for GDPR data portability.
   */
  export(): Promise<MemoryEntry[]>;

  /**
   * Delete ALL memory for GDPR right-to-erasure compliance.
   */
  purgeAll(): Promise<void>;
}
