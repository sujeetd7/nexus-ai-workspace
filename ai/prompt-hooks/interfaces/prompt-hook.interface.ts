/**
 * @module PromptHookInterfaces
 * @description Core TypeScript interfaces for the Prompt Hook Pipeline System.
 *
 * Architecture: Chain of Responsibility + Strategy Pattern
 *
 * Pipeline Flow:
 *   User Prompt → PreProcess → Compression → Security → Model → PostProcess
 *
 * All hooks are stateless. PromptContext is treated as immutable.
 * Hooks receive a context, perform their concern, and return a new context + result.
 */

// ---------------------------------------------------------------------------
// Primitive Supporting Types
// ---------------------------------------------------------------------------

/** A single turn in a conversation history */
export interface ConversationTurn {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

/** Execution metadata propagated through the pipeline */
export interface PromptMetadata {
  sessionId: string;
  userId?: string;
  tenantId?: string;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
  startedAt: Date;
  tags?: Record<string, string>;
}

/** A single hook trace entry for observability */
export interface HookTraceEntry {
  hookName: string;
  stage: HookStage;
  durationMs: number;
  mutated: boolean;
  skipped: boolean;
  error?: string;
}

/** Represents an injected tool or function definition */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Hook Stage
// ---------------------------------------------------------------------------

export enum HookStage {
  PREPROCESS = "preprocess",
  COMPRESSION = "compression",
  SECURITY = "security",
  POSTPROCESS = "postprocess",
}

// ---------------------------------------------------------------------------
// Core Interfaces
// ---------------------------------------------------------------------------

/**
 * Immutable snapshot of the prompt state at a given pipeline stage.
 * Hooks MUST NOT mutate this object — return a new PromptContext instead.
 */
export interface PromptContext {
  /** Unique identifier for this prompt execution run */
  readonly executionId: string;

  /** Original, unmodified user prompt */
  readonly originalPrompt: string;

  /** Current working prompt (may be modified by upstream hooks) */
  readonly currentPrompt: string;

  /** Injected system-level instructions */
  readonly systemInstructions?: string;

  /** Conversation history passed to the model */
  readonly history: ReadonlyArray<ConversationTurn>;

  /** Injected tool/function definitions */
  readonly tools: ReadonlyArray<ToolDefinition>;

  /** Execution metadata */
  readonly metadata: Readonly<PromptMetadata>;

  /** Ordered audit trail of all hooks that have run */
  readonly hookTrace: ReadonlyArray<HookTraceEntry>;

  /** Arbitrary key-value store for hooks to pass state downstream */
  readonly extensions: Readonly<Record<string, unknown>>;
}

/**
 * Result produced by a single hook execution.
 *
 * A hook may:
 * - Allow execution to continue (proceed = true)
 * - Block execution (proceed = false, with a reason)
 * - Return a mutated context (mutatedContext)
 */
export interface HookExecutionResult {
  /** Whether pipeline execution should continue after this hook */
  proceed: boolean;

  /** Updated context after hook processing (undefined if unchanged) */
  mutatedContext?: PromptContext;

  /** Reason for blocking (only when proceed = false) */
  blockReason?: string;

  /** Hook-level error, if any */
  error?: Error;

  /** Diagnostic metadata returned by the hook */
  diagnostics?: Record<string, unknown>;
}

/**
 * Final result of the complete prompt pipeline execution.
 */
export interface PromptResult {
  /** Whether the pipeline completed successfully */
  success: boolean;

  /** The final processed prompt context sent to the model */
  finalContext?: PromptContext;

  /** Raw model response content */
  modelResponse?: string;

  /** Blocking hook name (if execution was halted) */
  blockedBy?: string;

  /** Block reason (if execution was halted) */
  blockReason?: string;

  /** Total token usage */
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /** Full ordered trace of all executed hooks */
  hookTrace: HookTraceEntry[];

  /** Total pipeline execution time in milliseconds */
  totalDurationMs: number;

  /** Timestamp when execution started */
  executedAt: Date;
}

// ---------------------------------------------------------------------------
// Hook Interface
// ---------------------------------------------------------------------------

/**
 * Base interface for all Prompt Hooks.
 *
 * Implementations MUST be stateless. All state must be passed through PromptContext.
 * Hooks should be idempotent where possible.
 *
 * @template TConfig - Hook-specific configuration type
 */
export interface PromptHook<TConfig = unknown> {
  /** Unique hook identifier (used in trace and registry) */
  readonly name: string;

  /** Pipeline stage this hook belongs to */
  readonly stage: HookStage;

  /** Execution priority within a stage (lower = earlier) */
  readonly priority: number;

  /** Human-readable description of this hook's purpose */
  readonly description: string;

  /** Whether this hook is currently enabled */
  readonly enabled: boolean;

  /**
   * Execute the hook against the given context.
   * Must be non-blocking unless circuit-breaking (proceed = false).
   */
  execute(context: PromptContext): Promise<HookExecutionResult>;

  /**
   * Optional initialization with configuration.
   * Called once during pipeline setup.
   */
  initialize?(config: TConfig): Promise<void>;

  /**
   * Optional health check for this hook.
   * Used by monitoring infrastructure.
   */
  healthCheck?(): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Pipeline Interface
// ---------------------------------------------------------------------------

/**
 * Orchestrates the ordered execution of prompt hooks.
 * Follows the Chain of Responsibility pattern.
 */
export interface PromptPipeline {
  /** Register a hook into the pipeline */
  register(hook: PromptHook): void;

  /** Execute all registered hooks in priority order for the given stage */
  executeStage(
    stage: HookStage,
    context: PromptContext,
  ): Promise<HookExecutionResult>;

  /** Execute the full pipeline across all stages */
  execute(context: PromptContext): Promise<PromptResult>;
}
