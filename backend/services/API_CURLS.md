# API cURL snippets — ai-service, ai-kernel & prompt-service

## AI-Service (http://localhost:3007)

- **Execute (POST /api/v1/execute)**  
  POSIX:
  `curl -X POST http://localhost:3007/api/v1/execute -H "Content-Type: application/json" -d '{"provider":"ollama","model":"qwen2.5-coder:1.5b","prompt":"Hello from curl","temperature":0.2,"maxTokens":128}'`  
  PowerShell:
  `$payload = @{ provider='ollama'; model='qwen2.5-coder:1.5b'; prompt='Hello from PS'; temperature=0.2; maxTokens=128 }; Invoke-RestMethod -Uri 'http://localhost:3007/api/v1/execute' -Method Post -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 10)`

- **Stream (POST /api/v1/stream) — SSE**  
  POSIX (streaming):
  `curl -N -X POST http://localhost:3007/api/v1/stream -H "Content-Type: application/json" -d @backend/services/ai-service/tmp/stream-payload.json`  
  Windows (use curl.exe):
  `curl.exe -N -X POST http://localhost:3007/api/v1/stream -H "Content-Type: application/json" -d @backend/services/ai-service/tmp/stream-payload.json`  
  Note: `Invoke-RestMethod` does not reliably stream SSE — prefer `curl.exe -N`.

- **Embed (POST /api/v1/embed)**  
  POSIX:
  `curl -X POST http://localhost:3007/api/v1/embed -H "Content-Type: application/json" -d '{"input":["text A","text B"],"model":"text-embedding-1"}'`  
  PowerShell:
  `$payload = @{ input = @('text A','text B'); model='text-embedding-1' }; Invoke-RestMethod -Uri 'http://localhost:3007/api/v1/embed' -Method Post -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 10)`

- **Health (GET /api/v1/health)**  
  POSIX:
  `curl http://localhost:3007/api/v1/health`  
  PowerShell:
  `Invoke-RestMethod -Uri 'http://localhost:3007/api/v1/health' -Method Get`

- **Provider Health (GET /api/v1/provider-health?provider=ollama)**  
  POSIX:
  `curl "http://localhost:3007/api/v1/provider-health?provider=ollama"`  
  PowerShell:
  `Invoke-RestMethod -Uri 'http://localhost:3007/api/v1/provider-health?provider=ollama' -Method Get`

## AI-Kernel (http://localhost:3010)

- **Kernel Execute (POST /api/v1/kernel/execute)** — triggers kernel/provider delegation  
  POSIX:
  `curl -X POST http://localhost:3010/api/v1/kernel/execute -H "Content-Type: application/json" -d '{"input":"Summarize this","plan":{"stream":false},"options":{}}'`  
  PowerShell:
  `$payload = @{ input='Summarize this'; plan = @{ stream = $false }; options = @{} }; Invoke-RestMethod -Uri 'http://localhost:3010/api/v1/kernel/execute' -Method Post -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 10)`

---

## Prompt Service (via AI Kernel)

Preferred usage: invoke prompt rendering through the AI Kernel so the kernel's `PromptIntegrationModule` (which calls the Prompt Service) is the single source of truth. Send a kernel execute request containing `promptKey` and `variables`.

- **Render Prompt via Kernel (POST /api/v1/kernel/execute)**
  POSIX (curl):
  `curl -X POST http://localhost:3010/api/v1/kernel/execute -H "Content-Type: application/json" -d '{"promptKey":"assistant.default","variables":{"question":"Explain RAG"},"workspaceId":"workspace-123","promptVersion":"v2"}'`

  PowerShell:
  `$payload = @{ promptKey='assistant.default'; variables = @{ question = 'Explain RAG' }; workspaceId='workspace-123'; promptVersion='v2' }; Invoke-RestMethod -Uri 'http://localhost:3010/api/v1/kernel/execute' -Method Post -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 10)`

Notes:

- The kernel will call the Prompt Service `render` endpoint on your behalf when `promptKey` is present.
- The kernel request body may include `promptVersion` and `workspaceId` to request a specific prompt version or workspace override.
- For listing prompts, prompt metadata, or direct Prompt Service admin endpoints, call the Prompt Service API directly (if you run admin tooling). Runtime prompt rendering and execution should go through the kernel.

---

## Kernel Admin (Prompt metadata via AI Kernel)

Use these endpoints when you want to access prompt metadata through the kernel (proxies to the Prompt Service). These are intended for admin or tooling usage.

- **List Prompts (GET /api/v1/kernel/prompts)**
  - POSIX:
    `curl http://localhost:3010/api/v1/kernel/prompts`
  - PowerShell:
    `Invoke-RestMethod -Uri 'http://localhost:3010/api/v1/kernel/prompts' -Method Get`

- **Get Prompt By ID (GET /api/v1/kernel/prompts/{id})**
  - POSIX:
    `curl http://localhost:3010/api/v1/kernel/prompts/<PROMPT_ID>`
  - PowerShell:
    `Invoke-RestMethod -Uri 'http://localhost:3010/api/v1/kernel/prompts/<PROMPT_ID>' -Method Get`

- **Get Prompt Versions (GET /api/v1/kernel/prompts/{id}/versions)**
  - POSIX:
    `curl http://localhost:3010/api/v1/kernel/prompts/<PROMPT_ID>/versions`
  - PowerShell:
    `Invoke-RestMethod -Uri 'http://localhost:3010/api/v1/kernel/prompts/<PROMPT_ID>/versions' -Method Get`

Notes:

- These endpoints proxy to the Prompt Service and require the kernel's `PromptIntegrationModule` to be initialized and healthy.
- They are intended for admin tooling; runtime prompt rendering should use the `POST /api/v1/kernel/execute` flow with `promptKey`.
