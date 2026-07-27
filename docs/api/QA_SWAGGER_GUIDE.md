# QA Swagger Guide

## Prerequisites

1. Start Gateway and required services locally.
2. Open `http://localhost:3000/docs`.

## Token flow

1. Call `POST /api/v1/auth/login` from Gateway Swagger (or Auth direct spec).
2. Copy `accessToken` from the JSON response.
3. Open Gateway Swagger at `/docs`.
4. Click **Authorize**.
5. Paste the token (with `Bearer ` prefix if required).
6. Call a protected endpoint (for example `GET /api/v1/workspaces`).

Do not use example credentials in shared docs. Use your local test account.

## Path conventions

| Gateway path | Notes |
| ------------ | ----- |
| `/api/v1/auth/*` | Auth service |
| `/api/v1/users/*` | User service |
| `/api/v1/workspaces/*` | Workspace service |
| `/api/v1/documents/*` | Document metadata |
| `/api/v1/prompts/*` | Prompt service |
| `/api/v1/chat/*` | Chat (rewritten from service `/api/v1/*`) |
| `/api/v1/ai/*` | AI (rewritten from service `/api/v1/*`) |
| `/api/v1/agents/*` | Product agent service |
| `/api/v1/kernel/*` | AI Kernel public HTTP |

## Known Swagger limitations

- SSE/stream endpoints are documented but Swagger UI cannot reliably execute them. See [STREAMING.md](./STREAMING.md).
- Multipart upload is **not** documented because Document Service has no stable upload route.
- `GET /profile/me` is documented on Auth direct spec only (not Gateway-proxied).

## Service index

`GET /docs/services` lists direct JSON URLs and gateway path mapping per service.
