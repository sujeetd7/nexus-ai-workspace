# PII (Personally Identifiable Information) Detection

Guardrails that detect and protect PII in both inputs and outputs.

## Purpose

Prevent PII from entering the model (which could cause data residency violations)
and from leaking in model responses (which could expose sensitive user data).

## PII Categories

| Category     | Examples                                  | Regulation |
| ------------ | ----------------------------------------- | ---------- |
| Contact Info | Email, phone, address                     | GDPR, CCPA |
| Identity     | Name, SSN, passport, driver's license     | GDPR, CCPA |
| Financial    | Credit card, bank account, IBAN           | PCI-DSS    |
| Health       | Medical records, diagnoses, prescriptions | HIPAA      |
| Technical    | IP address, device ID, user ID            | GDPR       |
| Credentials  | Passwords, API keys, secrets              | Security   |

## Detection Methods

1. **Regex Patterns** — Fast, deterministic detection for structured PII
2. **NER (Named Entity Recognition)** — spaCy / Presidio for names, locations
3. **ML Classifier** — Context-aware PII with lower false-positive rate
4. **Rule Engine** — Business-specific PII rules (custom entity types)

## Recommended Production Tool

**Microsoft Presidio** — Open-source PII detection and anonymization:

- `presidio-analyzer` — Detection
- `presidio-anonymizer` — Redaction/replacement

## TODO

- [ ] Integrate Microsoft Presidio
- [ ] Add per-tenant PII policy configuration
- [ ] Add PII detection audit log (GDPR compliance)
- [ ] Implement PII pseudonymization (reversible for authorized users)
- [ ] Add custom entity type support
