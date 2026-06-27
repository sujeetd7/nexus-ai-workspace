/**
 * @guardrail PromptInjectionGuardrail
 * @appliesTo input
 * @severity CRITICAL
 *
 * Guardrail implementation for prompt injection detection.
 *
 * This is the guardrail layer (enforcement) built on top of the hook layer
 * (detection). The hook detects; the guardrail enforces policy.
 *
 * See also: ai/prompt-hooks/preprocess/prompt-injection-detection.hook.ts
 *
 * TODO: Replace pattern matching with a trained classifier
 * TODO: Add OWASP LLM01 test cases as integration tests
 * TODO: Feed detections into security monitoring / SIEM
 */

import type {
  Guardrail,
  GuardrailResult,
} from "../interfaces/guardrail.interface";
import {
  GuardrailSeverity,
  GuardrailVerdict,
} from "../interfaces/guardrail.interface";

export interface PromptInjectionGuardrailConfig {
  /** Confidence threshold to trigger BLOCK. Default: 0.8 */
  blockThreshold: number;
  /** Whether to also scan conversation history turns */
  scanHistory: boolean;
}

/**
 * Prompt Injection Detection Guardrail
 *
 * Checks incoming prompts for injection attack signatures.
 * Blocks the request on high-confidence detection.
 */
export class PromptInjectionGuardrail implements Guardrail<PromptInjectionGuardrailConfig> {
  readonly id = "GUARDRAIL_PROMPT_INJECTION";
  readonly name = "Prompt Injection Guardrail";
  readonly appliesTo = "input" as const;
  readonly severity = GuardrailSeverity.CRITICAL;
  readonly enabled = true;

  private config: PromptInjectionGuardrailConfig = {
    blockThreshold: 0.8,
    scanHistory: false,
  };

  // TODO: Replace with a production classifier
  private readonly PATTERNS = [
    { id: "PI-001", pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, confidence: 0.95 },
    { id: "PI-002", pattern: /disregard\s+(your\s+)?(guidelines|policy|rules|instructions)/i, confidence: 0.92 },
    { id: "PI-003", pattern: /you\s+are\s+now\s+(DAN|jailbroken|free|unrestricted)/i, confidence: 0.90 },
    { id: "PI-004", pattern: /act\s+as\s+(if\s+you\s+(have\s+no|don'?t\s+have)\s+restrictions)/i, confidence: 0.88 },
    { id: "PI-005", pattern: /\[SYSTEM\].*override|<\|system\|>/i, confidence: 0.85 },
  ];

  async initialize(config: PromptInjectionGuardrailConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async check(content: string, context?: Record<string, unknown>): Promise<GuardrailResult> {
    const start = Date.now();

    for (const rule of this.PATTERNS) {
      if (rule.pattern.test(content) && rule.confidence >= this.config.blockThreshold) {
        return {
          guardrailId: this.id,
          verdict: GuardrailVerdict.BLOCK,
          severity: this.severity,
          reason: `Prompt injection detected (rule: ${rule.id})`,
          confidence: rule.confidence,
          durationMs: Date.now() - start,
          diagnostics: { ruleId: rule.id },
        };
      }
    }

    // TODO: Run trained classifier for higher accuracy

    return {
      guardrailId: this.id,
      verdict: GuardrailVerdict.ALLOW,
      confidence: 1.0,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Jailbreak Detection Guardrail
 *
 * Detects attempts to bypass model safety training.
 *
 * TODO: Implement with a dedicated jailbreak classifier
 * TODO: Add DAN-specific pattern library
 * TODO: Add many-shot jailbreak detection (turn count analysis)
 */
export class JailbreakGuardrail implements Guardrail {
  readonly id = "GUARDRAIL_JAILBREAK";
  readonly name = "Jailbreak Detection Guardrail";
  readonly appliesTo = "input" as const;
  readonly severity = GuardrailSeverity.CRITICAL;
  readonly enabled = true;

  async check(content: string): Promise<GuardrailResult> {
    const start = Date.now();

    // TODO: Implement jailbreak detection
    // TODO: DAN patterns, role-play framing, fictional wrapper detection
    // TODO: Integrate with a fine-tuned safety classifier

    return {
      guardrailId: this.id,
      verdict: GuardrailVerdict.ALLOW,
      confidence: 1.0,
      durationMs: Date.now() - start,
      diagnostics: { status: "not_implemented" },
    };
  }
}
