# Guardrail Policies

Policy configuration and enforcement rules for the guardrail system.

## Purpose

Policies define **what guardrails are active** and at **what thresholds**,
and allow different configurations per tenant, role, or environment.

## Policy Types

| Policy Type        | Description                                         |
| ------------------ | --------------------------------------------------- |
| Default Policy     | Applied to all requests without a specific policy   |
| Tenant Policy      | Per-tenant customization (stricter or more lenient) |
| Role Policy        | Different rules for admin vs. end-user              |
| Environment Policy | Stricter in production, lenient in development      |

## Policy Schema

```typescript
interface GuardrailPolicy {
  id: string;
  name: string;
  tenantId?: string; // null = global
  environment: "production" | "staging" | "development";
  guardrails: {
    [guardrailId: string]: {
      enabled: boolean;
      config: Record<string, unknown>;
    };
  };
}
```

## Example: Production Default Policy

```json
{
  "id": "policy-default-production",
  "name": "Default Production Policy",
  "environment": "production",
  "guardrails": {
    "GUARDRAIL_PROMPT_INJECTION": {
      "enabled": true,
      "config": { "blockThreshold": 0.8 }
    },
    "GUARDRAIL_PII": { "enabled": true, "config": { "mode": "MASK" } },
    "GUARDRAIL_CONTENT_MODERATION": {
      "enabled": true,
      "config": { "flagThreshold": 0.8 }
    },
    "GUARDRAIL_RESPONSE_VALIDATION": {
      "enabled": true,
      "config": { "maxLengthChars": 100000 }
    }
  }
}
```

## Files

| File                  | Description                            |
| --------------------- | -------------------------------------- |
| `guardrail-policy.ts` | TypeScript policy interface and schema |
| `default-policy.json` | Default production policy (TODO)       |

## TODO

- [ ] Implement policy loader from MongoDB / config service
- [ ] Add policy hot-reload without restart
- [ ] Add policy version history and rollback
- [ ] Add policy A/B testing support
- [ ] Add OPA (Open Policy Agent) integration for complex rules
