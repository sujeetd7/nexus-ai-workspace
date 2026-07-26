# API Status

Scanned from registered Express routes in `backend/services/*`.  
Last updated from codebase scan: 2026-07-15.

See [`API_MAINTENANCE.md`](./API_MAINTENANCE.md) when adding or changing routes.  
curl examples: [`API_CURLS.md`](./API_CURLS.md).

## Legend

| Column | Values |
|--------|--------|
| **Implemented** | `Yes` = route + handler exist in repo |
| **Tested** | `No` · `Manual` · `Automated` · `Unit` (non-HTTP only) |
| **Working** | `Unknown` · `Yes` · `Partial` · `No` |

---

## AI-Service (default `http://localhost:3007`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/health` | GET | Yes | Manual | Partial | Chroma, LLM provider | Query `provider` (default `ollama`). Returns `chroma` + `provider` booleans. |
| `/api/v1/provider-health` | GET | Yes | Manual | Partial | LLM provider | Query `provider` (default `ollama`). Returns boolean JSON. |
| `/api/v1/execute` | POST | Yes | Manual | Partial | LLM provider | `prompt` required (400 if missing). Optional `workspaceId`, `userId`, `provider`, `model`. |
| `/api/v1/stream` | POST | Yes | Manual | Partial | LLM provider | SSE response. Same body shape as execute (`ExecuteAIDto`). |
| `/api/v1/embed` | POST | Yes | Manual | Partial | LLM provider | `provider` required (400 if missing). `input`, optional `model`. |
| `/api/v1/vector/upsert` | POST | Yes | Manual | Partial | LLM provider, Chroma | `UpsertVectorDto`. |
| `/api/v1/vector/upsert-batch` | POST | Yes | Manual | Partial | LLM provider, Chroma | `IndexBatchDto`. |
| `/api/v1/vector/search` | POST | Yes | Manual | Partial | LLM provider, Chroma | `SearchVectorDto`. |
| `/api/v1/rag/query` | POST | Yes | Manual | Partial | LLM provider, Chroma | Vector search + LLM. `RagQueryDto`. |
| `/api/v1/documents/index` | POST | Yes | Manual | Partial | LLM provider, Chroma | AI-Service vector indexing (not Document-Service). |
| `/api/v1/documents/reindex` | POST | Yes | Manual | Partial | LLM provider, Chroma | Deletes then re-indexes vectors. |
| `/api/v1/documents/delete` | POST | Yes | Manual | Partial | Chroma | Deletes vectors by `documentId` metadata. |
| `/api/v1/documents/stats` | POST | Yes | Manual | Partial | Chroma | Index stats for workspace collections. |

---

## AI-Kernel (default `http://localhost:3004`, prefix `/api/v1/kernel`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/kernel/execute` | POST | Yes | Manual | Partial | AI-Service (`AI_SERVICE_URL`) or local Ollama | Body: `IKernelExecutionRequest`. LLM step uses `ProviderModule.execute` → AI-Service when configured. |
| `/api/v1/kernel/prompts` | GET | Yes | No | Unknown | Prompt-Service (`PROMPT_SERVICE_URL`) | Proxies `PromptServiceClient.listPrompts()`. |
| `/api/v1/kernel/prompts/:id` | GET | Yes | No | Unknown | Prompt-Service | Proxies `getPrompt(id)`. |
| `/api/v1/kernel/prompts/:id/versions` | GET | Yes | No | Unknown | Prompt-Service | Reads versions from `GET /api/v1/prompts/:id` payload (no separate Prompt-Service versions route). |
| `/api/v1/kernel/documents` | GET | Yes | No | Unknown | Document-Service (`DOCUMENT_SERVICE_URL`) | Proxies `DocumentServiceClient.listDocuments()`. |

---

## Prompt-Service (default `http://localhost:3005`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/prompts` | POST | Yes | No | Unknown | PostgreSQL | `CreatePromptDto`. |
| `/api/v1/prompts/version` | POST | Yes | No | Unknown | PostgreSQL | `CreatePromptVersionDto`. |
| `/api/v1/prompts/execute` | POST | Yes | No | Unknown | PostgreSQL | Body uses `promptVersionId`, `input` in service. |
| `/api/v1/prompts/execute-published` | POST | Yes | No | Unknown | PostgreSQL, AI-Service | `ExecutePromptDto`. Calls AI-Service via internal client when rendering. |
| `/api/v1/prompts` | GET | Yes | No | Unknown | PostgreSQL | Query: `search`, `category`, `tag`, `favorite`, `shared`. |
| `/api/v1/prompts/analytics` | GET | Yes | No | Unknown | PostgreSQL | Query: optional `promptId`. |
| `/api/v1/prompts/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/prompts/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/prompts/version/:versionId/publish` | POST | Yes | No | Unknown | PostgreSQL | No body. |
| `/api/v1/prompts/rollback` | POST | Yes | No | Unknown | PostgreSQL | `RollbackPromptDto`. |
| `/api/v1/prompts/executions` | GET | Yes | No | Unknown | PostgreSQL | All execution history. |
| `/api/v1/prompts/:promptId/executions` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/prompts/execution/:executionId` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/prompts/playground` | POST | Yes | No | Unknown | PostgreSQL, AI-Service | `PlaygroundPromptDto`. |
| `/api/v1/prompts/compare` | POST | Yes | No | Unknown | PostgreSQL | `ComparePromptVersionDto`. |
| `/api/v1/evaluations/run` | POST | Yes | Unit | Unknown | — | Evaluator logic has unit tests; HTTP route not integration-tested. |
| `/api/v1/evaluations` | GET | Yes | No | Unknown | — | In-memory/history in service. |
| `/api/v1/evaluations/:id` | GET | Yes | No | Unknown | — | |
| `/api/v1/datasets` | POST | Yes | No | Unknown | — | In-memory `DatasetService`. |
| `/api/v1/datasets` | GET | Yes | No | Unknown | — | |
| `/api/v1/datasets/:id` | GET | Yes | No | Unknown | — | |
| `/api/v1/datasets/:id` | PUT | Yes | No | Unknown | — | |
| `/api/v1/datasets/:id` | DELETE | Yes | No | Unknown | — | |
| `/api/v1/datasets/:id/cases` | POST | Yes | No | Unknown | — | `PromptDatasetCase` body. |
| `/api/v1/datasets/:id/cases/:caseId` | DELETE | Yes | No | Unknown | — | |
| `/api/v1/benchmarks` | POST | Yes | No | Unknown | — | Requires `dataset` in body. |
| `/api/v1/benchmarks` | GET | Yes | No | Unknown | — | |
| `/api/v1/benchmarks/:id` | GET | Yes | No | Unknown | — | |

---

## Document-Service (default `http://localhost:3004`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/documents` | POST | Yes | No | Unknown | PostgreSQL | `CreateDocumentDto`. |
| `/api/v1/documents` | GET | Yes | No | Unknown | PostgreSQL | Query: `workspaceId`, `status`, `search`, `skip`, `take`. |
| `/api/v1/documents/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/documents/:id` | PATCH | Yes | No | Unknown | PostgreSQL | `UpdateDocumentDto`. |
| `/api/v1/documents/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |

---

## Auth-Service (default `http://localhost:3001`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/health` | GET | Yes | No | Unknown | — | |
| `/api/v1/auth/register` | POST | Yes | Automated | Unknown | PostgreSQL, JWT | `registerSchema` validation. |
| `/api/v1/auth/login` | POST | Yes | No | Unknown | PostgreSQL, JWT | |
| `/api/v1/auth/refresh` | POST | Yes | No | Unknown | JWT | |
| `/api/v1/auth/logout` | POST | Yes | No | Unknown | JWT | Bearer auth. |
| `/api/v1/auth/sessions` | GET | Yes | No | Unknown | JWT | Bearer auth (auth.routes). |
| `/api/v1/auth/sessions/:id` | DELETE | Yes | No | Unknown | JWT | Bearer auth (auth.routes). |
| `/api/v1/auth/sessions` | DELETE | Yes | No | Unknown | JWT | Logout all (auth.routes). Bearer auth. |
| `/api/v1/auth/verify-email` | POST | Yes | No | Unknown | SMTP | |
| `/api/v1/auth/resend-verification` | POST | Yes | No | Unknown | SMTP | |
| `/api/v1/auth/forgot-password` | POST | Yes | No | Unknown | SMTP | |
| `/api/v1/auth/reset-password` | POST | Yes | No | Unknown | SMTP | |
| `/api/v1/auth/sessions` | GET | Yes | No | Unknown | JWT | Also mounted via `session.routes.ts`. |
| `/api/v1/auth/sessions/:sessionId` | DELETE | Yes | No | Unknown | JWT | From `session.routes.ts`. |
| `/api/v1/auth/logout-all` | POST | Yes | No | Unknown | JWT | From `session.routes.ts`. |
| `/profile/me` | GET | Yes | No | Unknown | JWT | Bearer auth. |
| `/admin/dashboard` | GET | Yes | No | Unknown | JWT, admin role | `authorize([UserRole.ADMIN])`. |

---

## Agent-Service (default `http://localhost:3008`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/` | GET | Yes | No | Unknown | — | Health (`health.routes.ts`). |
| `/api/v1/agents` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/:id` | PUT | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/execute` | POST | Yes | No | Unknown | PostgreSQL, AI-Kernel | Client posts to `{AI_KERNEL_URL}/execute`; kernel route is `/api/v1/kernel/execute`. |
| `/api/v1/agents/executions` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/:agentId/executions` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/agents/execution/:executionId` | GET | Yes | No | Unknown | PostgreSQL | |

---

## Chat-Service (default `http://localhost:3006`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/health` | GET | Yes | No | Unknown | — | |
| `/api/v1/conversations` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations/member` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations/:id/members` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/messages` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/conversations/:id/messages` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/attachments` | POST | Yes | No | Unknown | PostgreSQL | |

---

## User-Service (default `http://localhost:3003`, prefix `/api/v1`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/users` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/users` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/users/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/users/:id` | PATCH | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/users/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |

---

## Workspace-Service (default `http://localhost:3002`)

| Endpoint | Method | Implemented | Tested | Working | Depends On | Notes |
|----------|--------|-------------|--------|---------|------------|-------|
| `/api/v1/health` | GET | Yes | No | Unknown | — | Inline handler in `routes/index.ts`. |
| `/health` | GET | Yes | No | Unknown | — | `health.routes.ts` mount. |
| `/api/v1/workspaces` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id` | PATCH | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/invitations` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/invitations` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/invitations/accept` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/invitations/reject` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/invitations/:invitationId` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/permissions` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/permissions/:userId` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/permissions/:userId/:permission` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/settings` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/settings` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/settings` | PATCH | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/billing` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/billing` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/billing` | PATCH | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/audit` | POST | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/audit` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/members` | POST | Yes | No | Unknown | PostgreSQL | Mounted in `app.ts` under `/api/v1/workspaces`. |
| `/api/v1/workspaces/:id/members` | GET | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/members/:memberId` | PATCH | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/members/:memberId` | DELETE | Yes | No | Unknown | PostgreSQL | |
| `/api/v1/workspaces/:id/members/:memberId` | GET | Yes | No | Unknown | PostgreSQL | |

---

## Port conflicts (from `server.ts` defaults)

| Port | Services |
|------|----------|
| 3004 | document-service, ai-kernel |

Set `PORT` per process when running multiple services locally.

---

## Summary counts

| Service | Routes documented |
|---------|-------------------|
| AI-Service | 13 |
| AI-Kernel | 5 |
| Prompt-Service | 27 |
| Document-Service | 5 |
| Auth-Service | 17 |
| Agent-Service | 10 |
| Chat-Service | 10 |
| User-Service | 5 |
| Workspace-Service | 28 |
| **Total** | **120** |
