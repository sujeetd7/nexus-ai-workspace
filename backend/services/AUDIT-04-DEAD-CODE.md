# Dead Code & Unused Modules

Implemented or scaffolded code with no consumers on the live path.

Status: `[ ]` open · `[x]` fixed

---

## Large unused trees

- [ ] `ai-kernel/src/agents/**` (~100+ files) — registry, lifecycle, runtime, orchestrator, coordinator, workflow, builtin agents, plugins — never booted by kernel
- [ ] `user-service/src/workspace-service/**` — dead nested workspace clone
- [ ] `services/api-gateway/**` — incomplete Express gateway; no `app.ts`/`server.ts`
- [ ] Stub services (scaffold / `.gitkeep` only):
  - [ ] `admin-service/`
  - [ ] `analytics-service/`
  - [ ] `notification-service/`
  - [ ] `ai-gateway/`

## Unused within live services

- [ ] `ai-service/src/embeddings/embedding.factory.ts` + `embedding.registry.ts` + stub providers — not used by `EmbeddingService` (uses `ProviderManager`)
- [ ] `ai-service/src/repositories/vector.repository.ts` — empty commented methods; never imported
- [ ] `prompt-service/src/prompts/**` + `prompt-templates/**` — only scripts (`test-prompt.ts`), not HTTP PromptService
- [ ] `prompt-service/src/compiler/prompt.compiler.ts` — unused duplicate
- [ ] `workspace-service/src/routes/workspace.routes.ts` — orphan duplicate routes
- [ ] `auth-service/src/docs/swagger.ts` — unused alternate swagger
- [ ] `auth-service/src/config/prisma.client.ts`, `database/prisma.ts` — unused / alternate clients
- [ ] Gateway auth/authorize/rbac/swagger plugins — unused at runtime
- [ ] `services/api-gateway` middleware + health routes — nothing mounts them
- [ ] `ai-kernel` agents `bootstrap/` — not exported from `agents/index.ts` barrel and unused externally

## Empty / no-op methods

- [ ] Multiple `ai-kernel` integration modules — `dispose(): Promise<void> {}`
- [ ] `planner.module.ts` — empty dispose; init only logs
- [ ] `vector.repository.ts` — only commented stubs
- [ ] `services/api-gateway/src/routes/index.ts` — empty router + TODO
