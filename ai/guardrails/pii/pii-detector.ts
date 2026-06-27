/**
 * @guardrail PIIGuardrail
 * @appliesTo both (input and output)
 * @severity HIGH
 *
 * Detects and redacts PII in both prompts (input) and model responses (output).
 *
 * Production Recommendation: Replace regex patterns with Microsoft Presidio
 * or AWS Comprehend for accurate, multi-language PII detection.
 *
 * TODO: Integrate Microsoft Presidio presidio-analyzer
 * TODO: Add reversible pseudonymization for authorized users
 * TODO: Emit GDPR-compliant PII detection audit events
 */

import type {
  Guardrail,
  GuardrailResult,
} from "../interfaces/guardrail.interface";
import {
  GuardrailSeverity,
  GuardrailVerdict,
} from "../interfaces/guardrail.interface";

export type PIIRedactionMode = "MASK" | "REDACT" | "PSEUDONYMIZE" | "BLOCK";

export interface PIIGuardrailConfig {
  /** Redaction behavior when PII is found. Default: "MASK" */
  mode: PIIRedactionMode;
  /** Whether to scan both input and output. Default: true */
  appliesTo: "input" | "output" | "both";
  /** Minimum confidence to flag as PII (0.0–1.0). Default: 0.8 */
  confidenceThreshold: number;
}

/** Detected PII instance */
export interface PIIDetection {
  category: string;
  value: string;      // WARNING: Only log this in secure audit logs
  startIndex: number;
  endIndex: number;
  confidence: number;
}

/**
 * PII Detection and Redaction Guardrail
 *
 * Scans content for PII and applies the configured redaction strategy.
 * Uses MODIFY verdict to return sanitized content.
 */
export class PIIGuardrail implements Guardrail<PIIGuardrailConfig> {
  readonly id = "GUARDRAIL_PII";
  readonly name = "PII Detection Guardrail";
  readonly appliesTo = "both" as const;
  readonly severity = GuardrailSeverity.HIGH;
  readonly enabled = true;

  private config: PIIGuardrailConfig = {
    mode: "MASK",
    appliesTo: "both",
    confidenceThreshold: 0.8,
  };

  // TODO: Replace with Presidio analyzer
  private readonly PATTERNS: Array<{ category: string; pattern: RegExp }> = [
    { category: "EMAIL", pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g },
    { category: "PHONE", pattern: /\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g },
    { category: "SSN", pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g },
    { category: "CREDIT_CARD", pattern: /\b(?:\d[ \-]?){13,16}\b/g },
    { category: "IP_ADDRESS", pattern: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g },
    { category: "API_KEY", pattern: /\b(sk-|pk-|bearer\s+)[A-Za-z0-9_\-]{20,}\b/gi },
  ];

  async initialize(config: PIIGuardrailConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async check(content: string): Promise<GuardrailResult> {
    const start = Date.now();
    const detections: PIIDetection[] = [];
    let sanitized = content;

    for (const { category, pattern } of this.PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(content)) !== null) {
        detections.push({
          category,
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.9,
        });
      }

      if (detections.some((d) => d.category === category)) {
        const replacement =
          this.config.mode === "MASK" ? `[${category}]` : "[REDACTED]";
        pattern.lastIndex = 0;
        sanitized = sanitized.replace(pattern, replacement);
      }
    }

    if (detections.length === 0) {
      return {
        guardrailId: this.id,
        verdict: GuardrailVerdict.ALLOW,
        confidence: 1.0,
        durationMs: Date.now() - start,
      };
    }

    if (this.config.mode === "BLOCK") {
      return {
        guardrailId: this.id,
        verdict: GuardrailVerdict.BLOCK,
        severity: this.severity,
        reason: `PII detected: ${[...new Set(detections.map((d) => d.category))].join(", ")}`,
        confidence: 0.9,
        durationMs: Date.now() - start,
        diagnostics: { piiCount: detections.length },
      };
    }

    return {
      guardrailId: this.id,
      verdict: GuardrailVerdict.MODIFY,
      modifiedContent: sanitized,
      reason: `PII redacted (${detections.length} instances)`,
      confidence: 0.9,
      durationMs: Date.now() - start,
      diagnostics: {
        piiCount: detections.length,
        categories: [...new Set(detections.map((d) => d.category))],
      },
    };
  }
}
