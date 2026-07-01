# Security Hooks

Hooks that enforce security policies on prompts before model execution.

## Purpose

Security hooks protect the platform and its users from adversarial inputs,
data leaks, and policy violations.

## Hooks in This Folder

| Hook                | Priority | Description                                         |
| ------------------- | -------- | --------------------------------------------------- |
| `PIIProtectionHook` | 40       | Detects and redacts PII before sending to the model |

## Security Standards

This module follows OWASP LLM Top 10:

- **LLM01** — Prompt Injection (see `preprocess/`)
- **LLM02** — Insecure Output Handling (see `postprocess/`)
- **LLM06** — Sensitive Information Disclosure (this folder)

## PII Categories Detected

- Names, email addresses, phone numbers
- Credit card numbers, social security numbers
- IP addresses, geolocation data
- Medical and health identifiers
- API keys and secrets (bonus detection)

## Redaction Modes

- `REDACT` — Replace PII with `[REDACTED]` placeholder
- `MASK` — Replace with type label: `[EMAIL]`, `[PHONE]`, etc.
- `BLOCK` — Halt pipeline execution entirely

## TODO

- [ ] `JailbreakDetectionHook` — Detect jailbreak and role-play attacks
- [ ] `SecretLeakDetectionHook` — Detect API keys/passwords in prompt
- [ ] Integrate with enterprise DLP (Data Loss Prevention) service
