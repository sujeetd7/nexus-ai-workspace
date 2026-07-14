# API cURL snippets — ai-service & ai-kernel

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
