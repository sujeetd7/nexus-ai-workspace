# Fake, Placeholder & Incomplete Implementations

Logic that pretends to work, returns fabricated data, or is explicitly unfinished.

Status: `[ ]` open · `[x]` fixed

---

## Fake LLM / agent responses

- [ ] Prompt `AIServiceClient` mock on missing URL / errors
- [ ] Prompt `PromptService.execute()` hard-coded mock output
- [ ] Agent execution mock on kernel failure
- [ ] Kernel `AgentExecutor.executeAgent()` simulated processing
- [ ] AI `MockProvider` registered in provider registry
- [ ] Provider factory unknown → MockProvider

## Placeholder / stub behavior

- [ ] Embedding OpenAI/Ollama providers: `embed()` throws `"Not implemented"`; `health()` returns `true`
- [ ] `usage.service.ts` — TODOs; stats return zeros / empty arrays
- [ ] `mcp-runtime.ts` — `{} as any` MCPManager
- [ ] Orchestrator plan loop — increments completed tasks without checking real state
- [ ] Workflow `compensateStep` — marks executed without rollback
- [ ] Workflow `evaluateCondition` — uses `eval(condition)`
- [ ] Workflow task step — placeholder fabricated result
- [ ] Benchmark controller — equality/`JSON.stringify` executor, not LLM
- [ ] BLEU evaluator — token overlap, not real BLEU
- [ ] Datasets / benchmarks — in-memory `Map` only (lost on restart)
- [ ] Builtin agents / coordinator health — placeholder `memoryUsage: 0` / `cpuUsage: 0`
- [ ] Tool agent `outputValid = true` placeholder when validateOutput requested
- [ ] MCP transport factory — WebSocket/custom cases marked future/placeholder

## Incomplete product features

- [ ] Document service — metadata CRUD only; no upload/storage/processing
- [ ] Chat service — REST only; no WebSocket/SSE
- [ ] Invitation accept — no member creation
- [ ] Agent conversations — schema/DTOs without APIs
