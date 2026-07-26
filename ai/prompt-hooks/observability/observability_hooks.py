"""
Observability Hooks — Python re-exports and observability-specific hooks

This module provides the observability-focused hooks for the prompt pipeline.
These hooks integrate with distributed tracing and metrics infrastructure.

TODO: Implement OpenTelemetry span creation per pipeline stage
TODO: Integrate with Langfuse for LLM-native tracing
TODO: Integrate with Arize Phoenix for evaluation tracing
TODO: Add per-tenant cost aggregation
"""

from __future__ import annotations

from ..interfaces.prompt_hook_interface import (
    HookExecutionResult,
    HookStage,
    PromptContext,
    PromptHook,
)


class TracingHook(PromptHook):
    """
    OpenTelemetry Tracing Hook

    Creates an OTEL span for each prompt pipeline execution and
    propagates trace context to downstream services.

    TODO: Implement with opentelemetry-sdk
    TODO: Add span attributes for model, tokens, cost
    TODO: Propagate W3C TraceContext headers to model API calls
    """

    name = "TracingHook"
    stage = HookStage.POSTPROCESS
    priority = 90
    description = "OpenTelemetry span creation for prompt pipeline execution"
    enabled = True

    async def execute(self, context: PromptContext) -> HookExecutionResult:
        # TODO: from opentelemetry import trace
        # TODO: tracer = trace.get_tracer("nexus.ai.prompt-pipeline")
        # TODO: with tracer.start_as_current_span("prompt.execute") as span:
        # TODO:     span.set_attribute("model.id", context.metadata.model_id)
        # TODO:     span.set_attribute("session.id", context.metadata.session_id)

        return HookExecutionResult(
            proceed=True,
            diagnostics={"tracing": "not_implemented"},
        )


class AuditHook(PromptHook):
    """
    Compliance Audit Hook

    Writes an immutable audit log entry for every prompt execution.
    Required for SOC2, HIPAA, and enterprise compliance.

    Audit log contains:
    - Who made the request (userId, tenantId)
    - What was requested (hash of prompt, not raw text)
    - When it occurred (ISO timestamp)
    - What model was used
    - Whether it was blocked and why

    TODO: Write to append-only audit store (MongoDB with no-delete policy)
    TODO: Include cryptographic hash of prompt for tamper detection
    TODO: Add audit event streaming to SIEM
    """

    name = "AuditHook"
    stage = HookStage.POSTPROCESS
    priority = 95
    description = "Immutable compliance audit logging"
    enabled = True

    async def execute(self, context: PromptContext) -> HookExecutionResult:
        # TODO: Compute SHA-256 of original prompt for audit trail
        # TODO: Write to append-only audit collection
        # TODO: Include GDPR data residency tags

        return HookExecutionResult(
            proceed=True,
            diagnostics={"audit": "not_implemented"},
        )
