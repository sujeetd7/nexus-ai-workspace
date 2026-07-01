# Validation Guardrails

Guardrails that validate the format, schema, and structure of inputs and outputs.

## Purpose

Ensure that prompts conform to expected formats and that model responses
meet the structural requirements of downstream consumers.

## Validation Types

### Input Validation

- Maximum prompt length enforcement
- Required fields validation (for structured prompts)
- Language detection and filtering
- Encoding validation (valid UTF-8, no null bytes)

### Output Validation

- JSON schema validation (for structured responses)
- Maximum response length enforcement
- Response completeness check (no truncated JSON)
- Citation format validation (for RAG responses)
- Code syntax validation (for code generation)

## Files

| File                    | Description                       |
| ----------------------- | --------------------------------- |
| `response-validator.ts` | Output validation guardrail       |
| `input-validator.ts`    | Input validation guardrail (TODO) |

## Interface: `PromptValidator`

```typescript
interface PromptValidator {
  validate(prompt: string): Promise<ValidationViolation[]>;
}
```

## TODO

- [ ] Implement `InputLengthValidator`
- [ ] Implement `OutputSchemaValidator` (JSON Schema validation)
- [ ] Implement `LanguageDetectionValidator`
- [ ] Implement `CodeSyntaxValidator` for code generation tasks
- [ ] Add validation rule DSL for business teams to define rules
