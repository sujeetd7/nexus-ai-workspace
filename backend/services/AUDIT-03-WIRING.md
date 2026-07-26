# Missing Wiring Issues

Code exists but is not connected to the request / boot path.

Status: `[ ]` open · `[x]` fixed

---

## Gateway

- [ ] `gateway/api-gateway/src/middleware/authenticate.middleware.ts` — not registered on proxies
- [ ] `gateway/api-gateway/src/middleware/authorize.middleware.ts` — not applied in `app.ts`
- [ ] `gateway/api-gateway/src/middleware/rbac.middleware.ts` — calls `authorize()` at load, exports nothing useful; unused
- [ ] `gateway/api-gateway/src/plugins/swagger.plugin.ts` — exists; not `app.register`'d in `app.ts`
- [ ] Proxies for `admin`, `notification`, `analytics` registered; upstream services have no implementation

## Auth

- [ ] `auth-service/src/routes/user.routes.ts` (`GET /me`) — not mounted in `app.ts`
- [ ] Verify-email / resend-verification schemas exist — no `validate()` on those routes

## AI Kernel

- [ ] Entire `ai-kernel/src/agents/**` — not imported from `kernel.factory.ts`, `app.ts`, `server.ts`, or `main.ts`
- [ ] `ai-kernel/src/agents/bootstrap/runtime-bootstrap.ts` — never started
- [ ] MCP stack exists under `ai-kernel/src/mcp/**` — no MCPModule in `kernel.factory.ts`
- [ ] `execution.module.ts` looks up `"MCPModule"` then falls back to basic tool registry
- [ ] `planner/planner.module.ts` + `PlannerService` — not registered; pipeline uses separate `PlannerExecutorStage`
- [ ] `PlannerExecutorStage` never sets `enableToolCalling` — tool-calling path in `LLMExecutor` stays off unless flag set elsewhere
- [ ] `dto/execute.request.ts` / `execute.response.ts` — unused; execute uses `IKernelExecutionRequest`

## Document / chat / agent APIs

- [ ] `document-service` version + tag repositories — never used by service/controller/routes
- [ ] No document version/tag/upload HTTP APIs
- [ ] `chat-service` `listAttachments` in service — no route
- [ ] `agent-service` conversation DTOs + Prisma Conversation models — no conversation routes/repos/controllers

## Validation (files exist, not on routes)

- [ ] `workspace-service/src/validators/**`
- [ ] `user-service/src/validators/user.validator.ts`
- [ ] `document-service/src/validators/document.validator.ts`
- [ ] `chat-service/src/validators/chat.validator.ts`
- [ ] Most domain services: no Zod middleware on routes (auth is partial exception)

## DTOs / entities unused

- [ ] `workspace-service/src/dto/**` — not imported by controllers/services
- [ ] `workspace-service/src/domain/entities/**` — not imported
- [ ] `user-service/src/dto/user.dto.ts` — not imported
- [ ] `chat-service/src/dto/chat.dto.ts` — not imported

## Route ordering bug

- [ ] `prompt-service/src/routes/prompt.routes.ts` — `GET /prompts/:id` before `GET /prompts/executions`; `executions` captured as `:id`
