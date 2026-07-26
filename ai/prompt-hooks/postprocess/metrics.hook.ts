/**
 * @hook MetricsHook
 * @stage postprocess
 * @priority 110
 *
 * Emits execution metrics for observability and cost tracking.
 *
 * Metrics emitted:
 * - Token usage (prompt, completion, total)
 * - Pipeline latency (total and per-stage)
 * - Model ID and provider
 * - Hook execution counts
 * - Cost estimation (USD)
 *
 * Design:
 * - Stateless — emits to external metrics backend via injected collector
 * - Follows OpenTelemetry metric conventions
 * - Non-blocking: errors in metrics emission MUST NOT affect pipeline result
 *
 * TODO: Integrate with Prometheus/OpenTelemetry MetricProvider
 * TODO: Implement per-model cost lookup table
 * TODO: Add per-tenant cost aggregation support
 */

import type {
  HookExecutionResult,
  PromptContext,
  PromptHook,
} from "../interfaces/prompt-hook.interface";
import { HookStage } from "../interfaces/prompt-hook.interface";

export interface MetricsHookConfig {
  /** Whether to emit cost estimates. Default: true */
  trackCosts: boolean;

  /** Metrics namespace prefix. Default: "nexus.ai" */
  namespace: string;

  /** Cost per 1K tokens by model (USD). Populated from config/pricing table) */
  costPerThousandTokens?: Record<string, { input: number; output: number }>;
}

/**
 * Metrics Hook
 *
 * Emits structured metrics for each prompt execution.
 * Errors in this hook are swallowed to prevent metrics failures
 * from disrupting the user experience.
 *
 * @implements {PromptHook<MetricsHookConfig>}
 */
export class MetricsHook implements PromptHook<MetricsHookConfig> {
  readonly name = "MetricsHook";
  readonly stage = HookStage.POSTPROCESS;
  readonly priority = 110;
  readonly description = "Emits token, latency, and cost metrics";
  readonly enabled = true;

  private config: MetricsHookConfig = {
    trackCosts: true,
    namespace: "nexus.ai",
    costPerThousandTokens: {
      "gpt-4o": { input: 0.005, output: 0.015 },
      "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
      "claude-3-5-sonnet": { input: 0.003, output: 0.015 },
      "claude-3-haiku": { input: 0.00025, output: 0.00125 },
    },
  };

  async initialize(config: MetricsHookConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async execute(context: PromptContext): Promise<HookExecutionResult> {
    try {
      // TODO: Replace with real OpenTelemetry meter
      // TODO: Forward to Prometheus/Grafana via OTEL exporter

      const metrics = this.buildMetrics(context);

      // Placeholder: log metrics to console in structured format
      // In production: otelMeter.createCounter(name).add(value, attributes)
      console.debug(
        `[MetricsHook] ${this.config.namespace}`,
        JSON.stringify(metrics),
      );

      return {
        proceed: true,
        diagnostics: metrics,
      };
    } catch (error) {
      // Metrics errors MUST NOT fail the pipeline
      console.error("[MetricsHook] Failed to emit metrics:", error);
      return { proceed: true };
    }
  }

  private buildMetrics(context: PromptContext): Record<string, unknown> {
    const modelId = context.metadata.modelId;
    const pricing = this.config.costPerThousandTokens?.[modelId];

    // TODO: Populate from actual PromptResult token counts
    const estimatedPromptTokens = Math.ceil(context.currentPrompt.length / 4);

    const estimatedCostUsd =
      pricing && this.config.trackCosts
        ? (estimatedPromptTokens / 1000) * pricing.input
        : null;

    return {
      [`${this.config.namespace}.execution_count`]: 1,
      [`${this.config.namespace}.history_turns`]: context.history.length,
      [`${this.config.namespace}.tool_count`]: context.tools.length,
      [`${this.config.namespace}.hook_trace_count`]: context.hookTrace.length,
      [`${this.config.namespace}.estimated_prompt_tokens`]:
        estimatedPromptTokens,
      [`${this.config.namespace}.estimated_cost_usd`]: estimatedCostUsd,
      model_id: modelId,
      session_id: context.metadata.sessionId,
      tenant_id: context.metadata.tenantId ?? "default",
    };
  }

  async healthCheck(): Promise<boolean> {
    // TODO: Verify metrics exporter connection
    return true;
  }
}
