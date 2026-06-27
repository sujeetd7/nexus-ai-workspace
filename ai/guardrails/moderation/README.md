# Content Moderation

Guardrails that detect and filter harmful, toxic, or inappropriate content.

## Purpose

Prevent harmful content from entering or exiting the model. This includes
hate speech, violence, self-harm, sexual content, and discriminatory language.

## Moderation Categories

| Category              | Description                                      | Severity |
|-----------------------|--------------------------------------------------|----------|
| Hate Speech           | Content targeting protected characteristics      | CRITICAL |
| Violence              | Graphic violence or threats                      | HIGH     |
| Self-Harm             | Content promoting or instructing self-harm       | CRITICAL |
| Sexual Content        | Explicit sexual content (NSFW)                   | HIGH     |
| Harassment            | Personal attacks, bullying                       | MEDIUM   |
| Misinformation        | Factual claims that are verifiably false         | MEDIUM   |
| Toxicity              | Generally offensive or inappropriate language    | MEDIUM   |

## Detection Approaches

| Approach                    | Notes                                          |
|-----------------------------|------------------------------------------------|
| OpenAI Moderation API       | Fast, free, covers most categories             |
| Azure AI Content Safety     | Enterprise-grade, configurable thresholds      |
| AWS Comprehend              | Multi-language, NER + sentiment                |
| Perspective API (Google)    | Toxicity scoring                               |
| Local model (Detoxify)      | Open-source, offline, lower accuracy           |

## Files

| File                      | Description                                    |
|---------------------------|------------------------------------------------|
| `content-moderator.ts`    | ContentModerator guardrail interface           |
| `toxicity-detector.ts`    | Toxicity-specific detection guardrail          |

## TODO

- [ ] Integrate OpenAI Moderation API
- [ ] Integrate Azure Content Safety for enterprise deployments
- [ ] Add per-tenant moderation threshold configuration
- [ ] Add moderation bypass for admin/developer roles
- [ ] Add moderation event streaming for human review queue
