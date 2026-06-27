/**
 * @module GuardrailInterfaces
 * @description Core TypeScript interfaces for the AI Guardrails System.
 *
 * Guardrails are synchronous (or fast-async) safety checks that wrap
 * model execution. They can:
 *   - ALLOW: Pass through to the next stage
 *   - MODIFY: Transform the content (e.g., redact PII)
 *   - BLOCK: Halt execution with a safety reason
 *
 * Design: Strategy Pattern + Chain of Responsibility
 *
 * @see OWASP LLM Top 10 - https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export enum GuardrailVerdict {
  /** Content is safe. Continue execution. */
  ALLOW = "ALLOW",
  /** Content was modified to be safe. Use modifiedContent. */
  MODIFY = "MODIFY",
  /** Content is unsafe. Halt execution. */
  BLOCK = "BLOCK",
}

export enum GuardrailSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Result of a single guardrail check.
 */
export interface GuardrailResult {
  /** Unique guardrail identifier */
  guardrailId: string;

  /** Decision: ALLOW, MODIFY, or BLOCK */
  verdict: GuardrailVerdict;

  /** Severity when verdict is BLOCK */
  severity?: GuardrailSeverity;

  /** Human-readable reason for the verdict */
  reason?: string;

  /** Modified content (only when verdict = MODIFY) */
  modifiedContent?: string;

  /** Confidence score 0.0–1.0 */
  confidence: number;

  /** Execution time in milliseconds */
  durationMs: number;

  /** Diagnostic metadata */
  diagnostics?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Base Guardrail Interface
// ---------------------------------------------------------------------------

/**
 * Base interface for all guardrails.
 *
 * Implementations are stateless and idempotent.
 * Guardrails should be fast: use async only for remote service calls.
 *
 * @template TConfig - Guardrail-specific configuration type
 */
export interface Guardrail<TConfig = unknown> {
  /** Unique identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Whether this guardrail applies to input, output, or both */
  readonly appliesTo: "input" | "output" | "both";

  /** Severity level of this guardrail's violations */
  readonly severity: GuardrailSeverity;

  /** Whether this guardrail is active */
  readonly enabled: boolean;

  /**
   * Check the content against this guardrail.
   *
   * @param content - The text to evaluate
   * @param context - Optional metadata about the execution context
   */
  check(content: string, context?: Record<string, unknown>): Promise<GuardrailResult>;

  /**
   * Optional initialization with config.
   * Called once at startup.
   */
  initialize?(config: TConfig): Promise<void>;
}

// ---------------------------------------------------------------------------
// Prompt Validator Interface
// ---------------------------------------------------------------------------

/**
 * Validates the structure, format, and content of an incoming prompt.
 * Distinct from guardrails — validators check format, not safety.
 */
export interface PromptValidator {
  /**
   * Validate a prompt and return any violations.
   * Returns empty array if prompt is valid.
   */
  validate(prompt: string): Promise<ValidationViolation[]>;
}

export interface ValidationViolation {
  field: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

// ---------------------------------------------------------------------------
// Content Moderator Interface
// ---------------------------------------------------------------------------

export interface ModerationCategory {
  category: string;
  score: number;       // 0.0–1.0 confidence
  flagged: boolean;
}

/**
 * Classifies content for harmful or inappropriate material.
 * Uses an underlying moderation model or API.
 *
 * TODO: Integrate with OpenAI Moderation API, Azure Content Safety, or AWS Comprehend
 */
export interface ContentModerator {
  /**
   * Moderate content and return category scores.
   * Uses multi-label classification.
   */
  moderate(content: string): Promise<{
    flagged: boolean;
    categories: ModerationCategory[];
    overallScore: number;
  }>;
}

// ---------------------------------------------------------------------------
// Guardrail Pipeline Interface
// ---------------------------------------------------------------------------

/**
 * Orchestrates multiple guardrails in sequence.
 * Stops on first BLOCK if failFast is enabled.
 */
export interface GuardrailPipeline {
  /** Register a guardrail into the pipeline */
  register(guardrail: Guardrail): void;

  /**
   * Run all applicable guardrails against the content.
   *
   * @param content    - Text to evaluate
   * @param appliesTo  - Stage: "input" or "output"
   * @param failFast   - Stop on first BLOCK. Default: true for input, false for output.
   */
  run(
    content: string,
    appliesTo: "input" | "output",
    failFast?: boolean
  ): Promise<{
    finalVerdict: GuardrailVerdict;
    results: GuardrailResult[];
    modifiedContent?: string;
  }>;
}
