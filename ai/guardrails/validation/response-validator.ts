/**
 * @guardrail ResponseValidator
 * @appliesTo output
 * @severity MEDIUM
 *
 * Validates model responses for structural integrity, format compliance,
 * and output sanitization before returning to the caller.
 *
 * Validations:
 * - Maximum response length
 * - JSON schema compliance (for structured outputs)
 * - No truncated JSON (response completeness)
 * - Output sanitization (strip dangerous HTML/script tags)
 *
 * TODO: Implement JSON Schema validation with ajv
 * TODO: Add code syntax validation for code generation outputs
 * TODO: Add hallucination detection (citation grounding check)
 */

import type {
  Guardrail,
  GuardrailResult,
  PromptValidator,
  ValidationViolation,
} from "../interfaces/guardrail.interface";
import {
  GuardrailSeverity,
  GuardrailVerdict,
} from "../interfaces/guardrail.interface";

// ---------------------------------------------------------------------------
// Response Validator Guardrail
// ---------------------------------------------------------------------------

export interface ResponseValidationConfig {
  /** Maximum allowed response length in characters. Default: 100000 */
  maxLengthChars: number;
  /** Whether to validate JSON structure for structured responses. Default: false */
  validateJson: boolean;
  /** Expected JSON schema (only relevant if validateJson=true) */
  jsonSchema?: Record<string, unknown>;
  /** Whether to strip HTML tags from response. Default: true */
  stripHtml: boolean;
}

/**
 * Response Validation and Sanitization Guardrail
 *
 * Validates and sanitizes model responses before returning to the caller.
 */
export class ResponseValidatorGuardrail implements Guardrail<ResponseValidationConfig> {
  readonly id = "GUARDRAIL_RESPONSE_VALIDATION";
  readonly name = "Response Validation Guardrail";
  readonly appliesTo = "output" as const;
  readonly severity = GuardrailSeverity.MEDIUM;
  readonly enabled = true;

  private config: ResponseValidationConfig = {
    maxLengthChars: 100_000,
    validateJson: false,
    stripHtml: true,
  };

  async initialize(config: ResponseValidationConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async check(content: string): Promise<GuardrailResult> {
    const start = Date.now();
    let sanitized = content;

    // --- Length check ---
    if (content.length > this.config.maxLengthChars) {
      return {
        guardrailId: this.id,
        verdict: GuardrailVerdict.BLOCK,
        severity: this.severity,
        reason: `Response exceeds maximum length (${content.length} > ${this.config.maxLengthChars})`,
        confidence: 1.0,
        durationMs: Date.now() - start,
      };
    }

    // --- HTML stripping (output sanitization) ---
    if (this.config.stripHtml) {
      // Basic XSS prevention: strip script tags and event handlers
      // TODO: Use a proper HTML sanitizer (DOMPurify on client, sanitize-html on server)
      const htmlStripped = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/\s*on\w+="[^"]*"/gi, "")
        .replace(/javascript:/gi, "");

      if (htmlStripped !== sanitized) {
        sanitized = htmlStripped;
      }
    }

    // --- JSON validation ---
    if (this.config.validateJson) {
      try {
        JSON.parse(content);
      } catch {
        return {
          guardrailId: this.id,
          verdict: GuardrailVerdict.BLOCK,
          severity: this.severity,
          reason: "Response is not valid JSON (structured output required)",
          confidence: 1.0,
          durationMs: Date.now() - start,
        };
      }
      // TODO: Validate against jsonSchema using ajv
    }

    const mutated = sanitized !== content;

    return {
      guardrailId: this.id,
      verdict: mutated ? GuardrailVerdict.MODIFY : GuardrailVerdict.ALLOW,
      modifiedContent: mutated ? sanitized : undefined,
      confidence: 1.0,
      durationMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// Input Length Validator (PromptValidator implementation)
// ---------------------------------------------------------------------------

/**
 * Validates that prompt length is within acceptable limits.
 *
 * TODO: Add token-based length check (currently character-based)
 */
export class InputLengthValidator implements PromptValidator {
  constructor(private readonly maxChars: number = 10_000) {}

  async validate(prompt: string): Promise<ValidationViolation[]> {
    const violations: ValidationViolation[] = [];

    if (prompt.trim().length === 0) {
      violations.push({
        field: "prompt",
        code: "PROMPT_EMPTY",
        message: "Prompt must not be empty",
        severity: "error",
      });
    }

    if (prompt.length > this.maxChars) {
      violations.push({
        field: "prompt",
        code: "PROMPT_TOO_LONG",
        message: `Prompt exceeds maximum length of ${this.maxChars} characters`,
        severity: "error",
      });
    }

    return violations;
  }
}
