# Service OpenAPI Inventory (W4)

| Service | Framework | Swagger | Spec path | UI path | Route coverage | State |
| ------- | --------- | ------- | --------- | ------- | -------------- | ----- |
| api-gateway | Fastify | @fastify/swagger + UI | `/docs/json` | `/docs` | Aggregated product APIs | **Complete** |
| auth-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Stable auth + profile routes | **Complete** |
| user-service | Express | @nexus/openapi | `/docs/json` | `/docs` | User CRUD | **Complete** |
| workspace-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Workspaces, members, invitations | **Complete** |
| document-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Metadata CRUD only | **Complete** |
| prompt-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Prompt + execution routes | **Complete** |
| ai-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Execute, stream, providers | **Complete** |
| chat-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Conversations + sendMessage | **Complete** |
| agent-service | Express | @nexus/openapi | `/docs/json` | `/docs` | Product agents + execution | **Complete** |
| ai-kernel | Express | @nexus/openapi | `/docs/json` | `/docs` | Public execute + health only | **Complete** |
| admin | — | — | — | — | — | **Deferred** |
| analytics | — | — | — | — | — | **Deferred** |
| notification | — | — | — | — | — | **Deferred** |

## Notes

- OpenAPI **3.0.3** with shared Bearer scheme and normalized error schemas via `@nexus/openapi`.
- Stable `operationId` values follow `authLogin`, `workspaceList`, `chatSendMessage`, etc.
- Internal Kernel integration routes (chat/workspace proxies inside kernel) are intentionally excluded from the public Kernel spec.
- Billing, audit, and extended workspace settings routes exist in code but are outside W4 stable public surface unless listed in service drift tests.
