# AI Guardrails System

Enterprise-grade safety and compliance guardrails for AI-generated content.

## Purpose

Guardrails protect users, the platform, and third parties from harmful, unsafe,
or non-compliant AI behavior. They act as a safety net around model execution.

## Architecture

```
Input (User Prompt)
    ↓
┌───────────────────────────────┐
│        Input Guardrails        │
│  ┌────────────────────────┐   │
│  │ Prompt Injection Check │   │
│  │ Jailbreak Detection    │   │
│  │ PII Detection          │   │
│  │ Input Validation       │   │
│  └────────────────────────┘   │
└───────────────────────────────┘
    ↓
   Model Execution
    ↓
┌───────────────────────────────┐
│        Output Guardrails       │
│  ┌────────────────────────┐   │
│  │ Toxicity Detection     │   │
│  │ PII Leakage Detection  │   │
│  │ Content Moderation     │   │
│  │ Response Validation    │   │
│  │ Output Sanitization    │   │
│  └────────────────────────┘   │
└───────────────────────────────┘
    ↓
Safe Response to User
```

## Folder Structure

```
guardrails/
├── interfaces/        ← Core interfaces: Guardrail, GuardrailResult, etc.
├── prompt-injection/  ← Prompt injection and jailbreak detection
├── pii/               ← PII detection and redaction
├── moderation/        ← Toxicity and content moderation
├── validation/        ← Input/output schema and format validation
├── policies/          ← Policy rules and guardrail configuration
├── input/             ← Input guardrail pipeline
└── output/            ← Output guardrail pipeline
```

## Interfaces

| Interface           | Description                                         |
|---------------------|-----------------------------------------------------|
| `Guardrail`         | Base interface for all guardrails                   |
| `GuardrailResult`   | Result from a guardrail check                       |
| `PromptValidator`   | Validates prompt structure and content              |
| `ContentModerator`  | Classifies and filters harmful content              |

## Guardrail Categories

| Category            | Input | Output | Critical |
|---------------------|-------|--------|----------|
| Prompt Injection    | ✓     |        | ✓        |
| Jailbreak Detection | ✓     |        | ✓        |
| PII Detection       | ✓     | ✓      |          |
| Toxicity Detection  |       | ✓      | ✓        |
| Content Moderation  | ✓     | ✓      |          |
| Response Validation |       | ✓      |          |
| Output Sanitization |       | ✓      |          |

## OWASP LLM Top 10 Coverage

| Risk                          | Folder           |
|-------------------------------|------------------|
| LLM01: Prompt Injection       | `prompt-injection/` |
| LLM02: Insecure Output        | `validation/`    |
| LLM06: Sensitive Info Disclosure | `pii/`        |
| LLM09: Overreliance           | `validation/`    |

## TODO

- [ ] Integrate with AWS Bedrock Guardrails
- [ ] Integrate with Azure AI Content Safety
- [ ] Add configurable guardrail policies per tenant
- [ ] Add guardrail bypass audit logging
- [ ] Add real-time guardrail telemetry
