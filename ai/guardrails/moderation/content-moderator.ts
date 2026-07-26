/**
 * @guardrail ContentModerationGuardrail
 * @appliesTo both
 * @severity HIGH/CRITICAL
 *
 * Multi-category content moderation guardrail.
 *
 * Production backend: OpenAI Moderation API or Azure AI Content Safety.
 *
 * TODO: Implement OpenAI Moderation API client
 * TODO: Implement Azure AI Content Safety client
 * TODO: Add per-category threshold configuration per tenant
 */

import type {
  ContentModerator,
  Guardrail,
  GuardrailResult,
  ModerationCategory,
} from "../interfaces/guardrail.interface";
import {
  GuardrailSeverity,
  GuardrailVerdict,
} from "../interfaces/guardrail.interface";

export interface ModerationConfig {
  /** Confidence threshold above which content is flagged. Default: 0.8 */
  flagThreshold: number;
  /** Whether to block flagged content (true) or just flag it (false). Default: true */
  blockOnFlag: boolean;
  /** Categories to check. Default: all */
  enabledCategories?: string[];
}

/**
 * Content Moderation Guardrail
 *
 * Delegates to a ContentModerator service for multi-category classification.
 * Can be configured to use OpenAI, Azure, or a custom backend.
 *
 * Pattern: Adapter — wraps any ContentModerator implementation.
 */
export class ContentModerationGuardrail implements Guardrail<ModerationConfig> {
  readonly id = "GUARDRAIL_CONTENT_MODERATION";
  readonly name = "Content Moderation Guardrail";
  readonly appliesTo = "both" as const;
  readonly severity = GuardrailSeverity.HIGH;
  readonly enabled = true;

  private config: ModerationConfig = {
    flagThreshold: 0.8,
    blockOnFlag: true,
  };

  constructor(private readonly moderator: ContentModerator) {}

  async initialize(config: ModerationConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async check(content: string): Promise<GuardrailResult> {
    const start = Date.now();

    const result = await this.moderator.moderate(content);

    const flaggedCategories = result.categories.filter(
      (c) => c.flagged && c.score >= this.config.flagThreshold,
    );

    if (flaggedCategories.length === 0 || !result.flagged) {
      return {
        guardrailId: this.id,
        verdict: GuardrailVerdict.ALLOW,
        confidence: 1.0 - result.overallScore,
        durationMs: Date.now() - start,
      };
    }

    if (this.config.blockOnFlag) {
      const categorySummary = flaggedCategories
        .map((c) => c.category)
        .join(", ");
      return {
        guardrailId: this.id,
        verdict: GuardrailVerdict.BLOCK,
        severity: this.severity,
        reason: `Content policy violation: ${categorySummary}`,
        confidence: result.overallScore,
        durationMs: Date.now() - start,
        diagnostics: {
          flaggedCategories,
          overallScore: result.overallScore,
        },
      };
    }

    return {
      guardrailId: this.id,
      verdict: GuardrailVerdict.ALLOW,
      reason: `Warning: potential policy violation (not blocking)`,
      confidence: result.overallScore,
      durationMs: Date.now() - start,
      diagnostics: { flaggedCategories },
    };
  }
}

/**
 * Placeholder ContentModerator implementation.
 *
 * TODO: Replace with OpenAI Moderation API:
 *   POST https://api.openai.com/v1/moderations
 * TODO: Or replace with Azure AI Content Safety
 */
export class PlaceholderContentModerator implements ContentModerator {
  async moderate(content: string): Promise<{
    flagged: boolean;
    categories: ModerationCategory[];
    overallScore: number;
  }> {
    // TODO: Call OpenAI Moderation API or Azure Content Safety
    // This is a STUB — always returns safe result
    return {
      flagged: false,
      categories: [
        { category: "hate", score: 0.0, flagged: false },
        { category: "violence", score: 0.0, flagged: false },
        { category: "self-harm", score: 0.0, flagged: false },
        { category: "sexual", score: 0.0, flagged: false },
        { category: "harassment", score: 0.0, flagged: false },
      ],
      overallScore: 0.0,
    };
  }
}
