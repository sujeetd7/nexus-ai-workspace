# Critical Production Blockers

Record from backend architecture / production-readiness audits. Fix these first.

Status legend: `[ ]` open · `[x]` fixed

---

## Mock / fake success paths

- [ ] `agent-service/src/services/agent-execution.service.ts` — on AI Kernel failure returns hardcoded mock success (`success: true`, fake content/tokens)
- [ ] `prompt-service/src/clients/ai-service.client.ts` — empty `AI_SERVICE_URL` or network error returns `"Mock LLM Response"` / fallback mock
- [ ] `prompt-service/src/services/prompt.service.ts` — `execute()` always persists `"Mock LLM Response"` with fake tokens/latency
- [ ] `ai-service/src/providers/provider.factory.ts` — static `create()` falls back to `MockProvider` for unknown providers
- [ ] `ai-kernel/src/agents/executor/agent-executor.ts` — `executeAgent()` returns fabricated `"Processed by..."` result (no real agent work)

## Gateway / routing

- [ ] `gateway/api-gateway/src/config/env.ts` — default upstream ports mismatch service `.env` (AI 3005 vs 3007, Kernel 3008 vs 3010, Agent 3004 vs 3008, etc.)
- [ ] `gateway/api-gateway/.env` — only sets `AUTH_SERVICE_URL`; other services rely on wrong defaults
- [ ] `gateway/api-gateway/src/app.ts` — auth middleware never applied to proxies; traffic unauthenticated at edge
- [ ] `gateway/api-gateway/src/config/env.ts` — `JWT_SECRET` defaults to `"development-secret"`

## Data integrity / silent degradation

- [ ] `workspace-service/src/repositories/workspace.repository.ts` — DB table-missing → in-memory Map success (same pattern in member repo)
- [ ] `workspace-service/src/services/workspace-invitation.service.ts` — accept only flips status; does not create `WorkspaceMember`

## Kernel / persistence gaps

- [ ] `ai-kernel/package.json` — declares Prisma schema path; no `prisma/` folder on disk
- [ ] `ai-kernel/src/kernel/kernel.factory.ts` — MCPModule not registered; agents bootstrap not started
- [ ] `ai-kernel/src/mcp/runtime/mcp-runtime.ts` — `MCPExecutionManager({} as any, ...)` placeholder MCPManager
