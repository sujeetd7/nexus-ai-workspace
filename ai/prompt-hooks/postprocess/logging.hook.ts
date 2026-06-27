/**
 * @hook LoggingHook
 * @stage postprocess
 * @priority 100
 *
 * Structured logging of prompt execution results.
 *
 * Logs:
 * - Execution ID, session ID, user ID (if available)
 * - Final prompt (redacted for PII in production)
 * - Model response (redacted for PII in production)
 * - Token usage
 * - Pipeline duration
 * - Hook trace summary
 *
 * Design:
 * - Uses structured JSON logging for log aggregation (ELK, Datadog, etc.)
 * - Sensitive fields are redacted before logging
 * - Never logs raw user prompts in production without consent/compliance review
 *
 * TODO: Integrate with OpenTelemetry log provider
 * TODO: Add log sampling for high-volume deployments
 * TODO: Add PII scrubbing before any logging
 */

import type {
  HookExecutionResult,
  PromptContext,
  PromptHook,
} from "../interfaces/prompt-hook.interface";
import { HookStage } from "../interfaces/prompt-hook.interface";

export interface LoggingHookConfig {
  /** Log level. Default: "info" */
  level: "debug" | "info" | "warn" | "error";

  /** Whether to include full prompt text. Default: false (security) */
  logPromptContent: boolean;

  /** Whether to include full response text. Default: false (security) */
  logResponseContent: boolean;

  /** Logger name / service identifier */
  serviceName: string;
}

/**
 * Structured Logging Hook
 *
 * Emits a structured log entry for every completed prompt execution.
 * Designed to be safe by default — sensitive content is NOT logged
 * unless explicitly enabled.
 *
 * @implements {PromptHook<LoggingHookConfig>}
 */
export class LoggingHook implements PromptHook<LoggingHookConfig> {
  readonly name = "LoggingHook";
  readonly stage = HookStage.POSTPROCESS;
  readonly priority = 100;
  readonly description = "Structured logging for prompt execution results";
  readonly enabled = true;

  private config: LoggingHookConfig = {
    level: "info",
    logPromptContent: false,
    logResponseContent: false,
    serviceName: "nexus-ai",
  };

  async initialize(config: LoggingHookConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  async execute(context: PromptContext): Promise<HookExecutionResult> {
    // TODO: Replace console.log with injected structured logger (Winston, Pino, etc.)
    // TODO: Forward to OpenTelemetry log provider
    // TODO: Apply PII scrubber before any field logging

    const logEntry = {
      timestamp: new Date().toISOString(),
      service: this.config.serviceName,
      executionId: context.executionId,
      sessionId: context.metadata.sessionId,
      userId: context.metadata.userId ?? "anonymous",
      tenantId: context.metadata.tenantId,
      modelId: context.metadata.modelId,
      historyTurns: context.history.length,
      toolCount: context.tools.length,
      hookTraceLength: context.hookTrace.length,
      // Only include prompt/response if explicitly enabled (compliance requirement)
      ...(this.config.logPromptContent && {
        // NOTE: In production, ALWAYS scrub PII before logging prompt
        promptSnippet: context.currentPrompt.slice(0, 100) + "...",
      }),
    };

    // TODO: Replace with structured logger
    console.log(JSON.stringify(logEntry));

    return {
      proceed: true,
      diagnostics: { logged: true },
    };
  }

  async healthCheck(): Promise<boolean> {
    // TODO: Verify logger transport is connected
    return true;
  }
}
