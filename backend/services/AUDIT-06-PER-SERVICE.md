# Per-Service Layer Gaps

Layer checklist from audits. Complete / Partial / Missing = as of audit.

Status: `[ ]` open · `[x]` fixed

---

## Cross-cutting (almost every service)

- [ ] Dependency Injection — no container; widespread `new Service()` / `new Controller()`
- [ ] Swagger — only auth mounts UI; gateway swagger plugin unwired; others missing
- [ ] Events — only auth has real email publish; others Missing
- [ ] Route validation — only auth partially wired Zod into routes

## auth-service

- [ ] Mount `user.routes.ts` / decide delete
- [ ] Wire validate on verify-email / resend-verification
- [ ] Consolidate Prisma client entry points
- [ ] Remove unused `docs/swagger.ts` or merge

## workspace-service

- [ ] Wire validators into routes
- [ ] Use or delete DTOs / domain entities
- [ ] Remove orphan `workspace.routes.ts`
- [ ] Remove in-memory DB fallback
- [ ] Fix invitation accept → create member
- [ ] Add auth/RBAC enforcement
- [ ] Add Swagger

## user-service

- [ ] Delete nested `src/workspace-service/**`
- [ ] Wire validator + DTO
- [ ] Integrate profile creation with auth-service
- [ ] Error middleware
- [ ] Swagger

## document-service

- [ ] Wire or remove version/tag repos + APIs
- [ ] File upload/storage
- [ ] Wire validator
- [ ] Error middleware
- [ ] AI indexing integration
- [ ] Swagger

## chat-service

- [ ] Wire validator / DTO or delete
- [ ] Attachment list route
- [ ] Error middleware
- [ ] Real-time (if required)
- [ ] Swagger

## prompt-service

- [ ] Remove mock execute + client fallbacks (fail closed)
- [ ] Fix route order (`/executions` vs `/:id`)
- [ ] Persist datasets/benchmarks (or mark non-prod)
- [ ] Error middleware
- [ ] Remove unused `prompt.compiler.ts` / prompts+templates dead stack
- [ ] Swagger

## ai-service

- [ ] Remove unknown→MockProvider fallback (or restrict to explicit `mock`)
- [ ] Fix or remove stub embedding providers / unused embedding factory tree
- [ ] Implement or remove `vector.repository.ts`
- [ ] Persist usage analytics (TODOs)
- [ ] Swagger / stronger request validation

## agent-service

- [ ] Fail closed on kernel errors (no mock success)
- [ ] Conversation APIs or drop schema/DTOs
- [ ] Route validation
- [ ] Auth / workspace scoping
- [ ] Swagger

## ai-kernel

- [ ] Controllers layer (or keep routes-only deliberately)
- [ ] Prisma / persistence if required
- [ ] Register MCP + decide fate of agents runtime (wire or quarantine)
- [ ] Fix orchestrator/coordinator ↔ runtime barrel circular imports
- [ ] Export bootstrap from agents barrel if kept
- [ ] HTTP request validation
- [ ] Swagger

## gateway/api-gateway

- [ ] Align env URLs/ports with all services
- [ ] Register authenticate on protected proxies
- [ ] Register swagger plugin
- [ ] Stop proxying non-existent admin/notification/analytics (or build them)

## Stubs

- [ ] `admin-service` — implement or remove proxy
- [ ] `analytics-service` — implement or remove proxy
- [ ] `notification-service` — implement or remove proxy
- [ ] `ai-gateway` — implement or remove
- [ ] Delete or finish `services/api-gateway`
