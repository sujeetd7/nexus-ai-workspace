# Pre-Process Hooks

Hooks that execute **before** the prompt is sent to the model.

## Purpose

Pre-process hooks prepare, optimize, and validate the incoming prompt. They run
in priority order and may mutate the `PromptContext` or halt the pipeline.

## Hooks in This Folder

| Hook                           | Priority | Description                                         |
| ------------------------------ | -------- | --------------------------------------------------- |
| `TokenOptimizationHook`        | 10       | Reduces token count without losing semantic meaning |
| `PromptInjectionDetectionHook` | 20       | Detects and blocks prompt injection attempts        |

## Execution Order

Hooks run in ascending priority order. Lower priority number = runs first.

## TODO

- [ ] `HistorySummarizationHook` — Summarize long conversation histories
- [ ] `LanguageNormalizationHook` — Normalize prompt language/encoding
- [ ] `IntentClassificationHook` — Classify prompt intent for routing
