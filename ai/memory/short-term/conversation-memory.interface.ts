/**
 * @module ConversationMemoryInterface
 * @description Short-term (working) memory interface for active conversation sessions.
 *
 * Backed by Redis for low-latency in-session access.
 * All data is ephemeral and scoped to a single sessionId.
 *
 * TODO: Implement RedisConversationMemory adapter in stores/
 */

import type { ConversationTurn } from "../../hooks/prompt-hooks/interfaces/prompt-hook.interface";

// ---------------------------------------------------------------------------
// Conversation Memory
// ---------------------------------------------------------------------------

/**
 * Short-term working memory for an active conversation session.
 *
 * Stores conversation turns and session state for the duration of a session.
 * Backed by Redis with configurable TTL.
 */
export interface ConversationMemory {
  /** Session this memory belongs to */
  readonly sessionId: string;

  /**
   * Add a new conversation turn to session memory.
   * Older turns may be evicted if token budget is exceeded.
   */
  addTurn(turn: ConversationTurn): Promise<void>;

  /**
   * Retrieve the most recent N conversation turns.
   * If limit is omitted, returns all turns within the token budget.
   */
  getTurns(limit?: number): Promise<ConversationTurn[]>;

  /**
   * Get the current total token count of stored turns.
   * Uses the configured tokenizer.
   */
  getTokenCount(): Promise<number>;

  /**
   * Store arbitrary session-scoped key-value state.
   * Useful for tool state, agent scratchpad, etc.
   */
  setContext(key: string, value: unknown): Promise<void>;

  /**
   * Retrieve session-scoped state by key.
   */
  getContext<T>(key: string): Promise<T | null>;

  /**
   * Clear all memory for this session.
   * Called on session end or explicit reset.
   */
  clear(): Promise<void>;

  /**
   * Extend the TTL of this session's memory.
   * Called when the session is still active.
   */
  refreshTTL?(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Memory Provider Interface (base)
// ---------------------------------------------------------------------------

/**
 * Base interface for all memory backends.
 * Extended by ConversationMemory, EpisodicMemory, SemanticMemory.
 */
export interface MemoryProvider {
  /** Provider type identifier */
  readonly providerType: "redis" | "mongodb" | "chromadb" | "in-memory";

  /** Initialize connection to the backing store */
  connect(): Promise<void>;

  /** Gracefully disconnect */
  disconnect(): Promise<void>;

  /** Check if the backend is healthy */
  healthCheck(): Promise<boolean>;
}
