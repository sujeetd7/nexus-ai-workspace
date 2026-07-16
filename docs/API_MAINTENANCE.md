# API documentation maintenance

When you add, change, or remove an HTTP route in any backend service, update **both**:

1. [`docs/API_CURLS.md`](./API_CURLS.md) — curl examples (Method, URL, Headers, Sample Body, curl)
2. [`docs/API_STATUS.md`](./API_STATUS.md) — status table (Endpoint, Method, Implemented, Tested, Working, Depends On, Notes)

## Rules

- **Scan routes only** — document endpoints registered in `routes/` (and `app.ts` mount prefixes). Do not list client calls, planned APIs, or Swagger-only paths unless a route handler exists.
- **No assumptions** — sample bodies must match DTOs or fields read in controllers/services. If the shape is `req.body` typed as `any`, document the fields actually used in code.
- **Implemented** — `Yes` only when a route + handler exist in the repo. Omit endpoints that are not implemented.
- **Tested** — use one of:
  - `No` — no automated or recorded manual test
  - `Manual` — verified with curl/HTTP client (note date or PR in Notes if helpful)
  - `Automated` — covered by an integration/e2e test that hits the HTTP route
  - `Unit` — only the client/service layer is tested, not the HTTP route (not equivalent to Automated)
- **Working** — use one of:
  - `Unknown` — not verified at runtime
  - `Yes` — verified success path
  - `Partial` — works with conditions (e.g. external service must be up)
  - `No` — known failure (document in Notes)
- **Depends On** — runtime dependencies from code: PostgreSQL, Redis, Ollama, Chroma, other services, env vars. Use `—` if none beyond the service process.
- **Default ports** — take from each service `server.ts` / env config; note `PORT` overrides.

## Service mount prefixes (current)

| Service | Default port | API prefix |
|---------|--------------|------------|
| workspace-service | 3002 | `/api/v1`, `/health` |
| user-service | 3003 | `/api/v1` |
| document-service | 3004 | `/api/v1` |
| ai-kernel | 3004 | `/api/v1/kernel` |
| prompt-service | 3005 | `/api/v1` |
| chat-service | 3006 | `/api/v1` |
| ai-service | 3007 | `/api/v1` |
| agent-service | 3008 | `/api/v1` |
| auth-service | see `auth-service` env | `/health`, `/api/v1/auth`, `/profile`, `/admin` |

## Checklist for a new endpoint

1. Register route in the service `routes/` file.
2. Add row to `API_STATUS.md` under the correct service table.
3. Add curl block to `API_CURLS.md`.
4. Run or add a test; update **Tested** and **Working** when verified.
