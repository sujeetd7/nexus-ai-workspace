# Observability Hooks

Hooks dedicated to **observability**: logging, metrics, tracing, and audit.

## Purpose

Observability hooks run in the post-process stage and are responsible for
capturing comprehensive telemetry on every prompt execution.

They are designed to be non-blocking: failures in observability MUST NOT
affect prompt pipeline execution.

## Hooks in This Folder

| Hook          | Priority | Description                                     |
| ------------- | -------- | ----------------------------------------------- |
| `LoggingHook` | 100      | Structured JSON logging of execution metadata   |
| `MetricsHook` | 110      | Token usage, latency, and cost metrics emission |

> **Note**: Both hooks also exist in `postprocess/`. This folder provides
> the observability-focused variant with deeper telemetry integration.

## Integrations

| System        | Status  | Notes                                    |
| ------------- | ------- | ---------------------------------------- |
| OpenTelemetry | Planned | Traces and logs via OTEL SDK             |
| Prometheus    | Planned | Metrics via OTEL → Prometheus exporter   |
| Grafana       | Planned | Dashboards on top of Prometheus          |
| Langfuse      | Planned | LLM-specific observability platform      |
| Phoenix       | Planned | Arize Phoenix for LLM evaluation tracing |

## TODO

- [ ] Implement OpenTelemetry trace context propagation
- [ ] Add `TracingHook` with span creation per pipeline stage
- [ ] Add `AuditHook` for compliance audit log (immutable audit trail)
- [ ] Add `CostTrackingHook` for per-session cost aggregation
- [ ] Add `LangfuseHook` for LLM-native tracing
