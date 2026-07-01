/**
 * @hook PromptInjectionDetectionHook
 * @stage preprocess
 * @priority 20
 *
 * Detects and blocks prompt injection attacks before they reach the model.
 *
 * Prompt Injection: An attacker embeds instructions within user input
 * to override system instructions or manipulate model behavior.
 *
 * Detection Strategies:
 * - Pattern matching against known injection signatures
 * - Instruction override detection ("Ignore all previous instructions...")
 * - Role impersonation detection ("You are now DAN...")
 * - Delimiter confusion attacks
 * - Encoding-based evasion (base64, unicode tricks)
 *
 * Design: Halts pipeline (proceed=false) on confirmed injection.
 *
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 * LLM01: Prompt Injection
 */

import type {
  HookExecutionResult,
  PromptContext,
  PromptHook,
} from "../interfaces/prompt-hook.interface";
import { HookStage } from "../interfaces/prompt-hook.interface";

export interface InjectionDetectionConfig {
  /** Sensitivity level. Higher = more aggressive detection. Default: "medium" */
  sensitivity: "low" | "medium" | "high";

  /** Block on detection, or just flag. Default: true */
  blockOnDetection: boolean;

  /** Custom patterns to match in addition to built-in rules */
  customPatterns?: RegExp[];
}

export interface DetectionResult {
  detected: boolean;
  ruleId?: string;
  confidence: number;
  matchedText?: string;
}

/**
 * Prompt Injection Detection Hook
 *
 * Scans the incoming user prompt for injection attack signatures.
 * Blocks execution on high-confidence detections.
 *
 * @implements {PromptHook<InjectionDetectionConfig>}
 */
export class PromptInjectionDetectionHook implements PromptHook<InjectionDetectionConfig> {
  readonly name = "PromptInjectionDetectionHook";
  readonly stage = HookStage.PREPROCESS;
  readonly priority = 20;
  readonly description = "Detects and blocks prompt injection attacks";
  readonly enabled = true;

  private config: InjectionDetectionConfig = {
    sensitivity: "medium",
    blockOnDetection: true,
  };

  /**
   * Known injection pattern signatures (placeholder — NOT production-complete).
   *
   * TODO: Replace with a trained classifier or dedicated security service
   * TODO: Integrate with OWASP LLM security guidelines
   * TODO: Add semantic embedding-based detection for novel attacks
   */
  private readonly INJECTION_PATTERNS: Array<{
    id: string;
    pattern: RegExp;
    confidence: number;
  }> = [
    {
      id: "OVERRIDE_001",
      pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+instructions/i,
      confidence: 0.95,
    },
    {
      id: "OVERRIDE_002",
      pattern:
        /disregard\s+(your\s+)?(previous|above|prior|system)\s+(instructions|prompt)/i,
      confidence: 0.92,
    },
    {
      id: "ROLEPLAY_001",
      pattern: /you\s+are\s+now\s+(DAN|an?\s+AI\s+without\s+restrictions)/i,
      confidence: 0.88,
    },
    {
      id: "SYSTEM_OVERRIDE",
      pattern: /\[SYSTEM\]\s*:|<\|system\|>/i,
      confidence: 0.85,
    },
    {
      id: "ESCAPE_001",
      pattern: /```\s*\n.*ignore.*instructions/is,
      confidence: 0.8,
    },
  ];

  async initialize(config: InjectionDetectionConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async execute(context: PromptContext): Promise<HookExecutionResult> {
    const result = this.scan(context.currentPrompt);

    if (result.detected && this.config.blockOnDetection) {
      return {
        proceed: false,
        blockReason: `Prompt injection detected (rule: ${result.ruleId}, confidence: ${result.confidence})`,
        diagnostics: {
          ruleId: result.ruleId,
          confidence: result.confidence,
          // NOTE: Do NOT log matchedText in production (may contain PII/attack payload)
        },
      };
    }

    return {
      proceed: true,
      diagnostics: {
        injectionDetected: result.detected,
        confidence: result.confidence,
      },
    };
  }

  private scan(prompt: string): DetectionResult {
    // TODO: Implement multi-pass scanning with weighted scoring
    // TODO: Add cross-turn injection detection (attacks spread across turns)

    for (const rule of this.INJECTION_PATTERNS) {
      if (rule.pattern.test(prompt)) {
        if (rule.confidence >= this.sensitivityThreshold()) {
          return {
            detected: true,
            ruleId: rule.id,
            confidence: rule.confidence,
          };
        }
      }
    }

    // Check custom patterns
    if (this.config.customPatterns) {
      for (const pattern of this.config.customPatterns) {
        if (pattern.test(prompt)) {
          return { detected: true, ruleId: "CUSTOM", confidence: 0.9 };
        }
      }
    }

    return { detected: false, confidence: 0 };
  }

  private sensitivityThreshold(): number {
    const thresholds: Record<InjectionDetectionConfig["sensitivity"], number> =
      {
        low: 0.9,
        medium: 0.8,
        high: 0.7,
      };
    return thresholds[this.config.sensitivity];
  }

  async healthCheck(): Promise<boolean> {
    return this.INJECTION_PATTERNS.length > 0;
  }
}
