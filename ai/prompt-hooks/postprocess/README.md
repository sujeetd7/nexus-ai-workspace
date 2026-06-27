# Post-Process Hooks

Hooks that execute **after** the model produces a response.

## Purpose

Post-process hooks inspect, enrich, validate, and log the model's output before
it is returned to the caller.

## Hooks in This Folder

| Hook           | Priority | Description                                      |
|----------------|----------|--------------------------------------------------|
| `LoggingHook`  | 100      | Structured logging of prompt + response pairs    |
| `MetricsHook`  | 110      | Emit token usage, latency, and cost metrics      |

## Execution Order

Hooks run in ascending priority order. Post-process hooks run after the model
response is available in the `PromptResult`.

## TODO

- [ ] `ResponseValidationHook` — Validate model output format/schema
- [ ] `OutputSanitizationHook` — Remove leaked PII or sensitive data from responses
- [ ] `HallucinationDetectionHook` — Basic factuality scoring
- [ ] `CitationEnrichmentHook` — Append sources to RAG responses
