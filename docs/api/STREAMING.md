# Streaming (SSE) Documentation

Swagger UI does not reliably execute Server-Sent Events. Use curl or PowerShell for streaming QA.

## AI stream — Gateway path

**Endpoint:** `POST /api/v1/ai/stream`  
**Content-Type:** `application/json`  
**Response:** `text/event-stream`

### Event shape

Each event line: `data: <json>\n\n`

Event types include token chunks and a completion event (`type: done`). Provider failures return non-2xx or error events per service behavior.

### curl (bash)

```bash
curl -N \
  -H "Authorization: Bearer $NEXUS_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain dependency injection"}' \
  http://localhost:3000/api/v1/ai/stream
```

### PowerShell

```powershell
curl.exe -N `
  -H "Authorization: Bearer $env:NEXUS_ACCESS_TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"prompt":"Explain dependency injection"}' `
  http://localhost:3000/api/v1/ai/stream
```

## AI chat stream

**Endpoint:** `POST /api/v1/ai/chat/stream`

Same headers and SSE semantics as `/api/v1/ai/stream`, with a `messages` array in the request body.

## Cancellation

Closing the client connection cancels the upstream stream; no fabricated fallback response is returned.

Do not place real tokens in documentation.
