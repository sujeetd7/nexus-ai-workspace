# Canonical API Gateway — `@nexus/api-gateway`

Production entrypoint for Nexus AI Workspace HTTP traffic.

```text
Client → @nexus/api-gateway → verified access token (where required) → product service
```

## Package

| Item | Value |
| --- | --- |
| Path | `backend/gateway/api-gateway` |
| Package | `@nexus/api-gateway` |
| Default port | `3000` |

The Express duplicate at `backend/services/api-gateway` is **retired** (`@nexus/api-gateway-retired`, excluded from the workspace).

## Commands

```powershell
pnpm --filter @nexus/api-gateway typecheck
pnpm --filter @nexus/api-gateway build
pnpm --filter @nexus/api-gateway test
pnpm --filter @nexus/api-gateway dev
```

## Upstream defaults (W3)

| Service | Port | Env |
| --- | --- | --- |
| Auth | 3001 | `AUTH_SERVICE_URL` |
| Workspace | 3002 | `WORKSPACE_SERVICE_URL` |
| User | 3003 | `USER_SERVICE_URL` |
| Document | 3004 | `DOCUMENT_SERVICE_URL` |
| Prompt | 3005 | `PROMPT_SERVICE_URL` |
| Chat | 3006 | `CHAT_SERVICE_URL` |
| AI | 3007 | `AI_SERVICE_URL` |
| Agent | 3008 | `AGENT_SERVICE_URL` |
| AI Kernel | 3010 | `AI_KERNEL_URL` |

Admin / Analytics / Notification are **not** proxied.

## Auth contract

- Gateway verifies **access tokens only** with `JWT_ACCESS_SECRET` (same as Auth Service).
- Refresh-token verification remains in Auth Service.
- Trusted internal headers (injected only after verify): `x-user-id`, `x-user-role`, `x-user-email`, plus `x-request-id` / `x-correlation-id`.
- Client-supplied `x-user-*` values are stripped/overwritten.

## Operational endpoints

| Path | Meaning |
| --- | --- |
| `GET /health` | Gateway process alive |
| `GET /readiness` | Required product upstreams reachable → **200**; any mandatory upstream down → **503** |

## Swagger

Deferred to **W4** (service OpenAPI aggregation). The local Swagger plugin is intentionally not registered in W3.

## Multipart / SSE

- Multipart: content-type/boundary preserved; body streamed; Gateway `PROXY_BODY_LIMIT` enforced. Document Service has no stable multipart upload route yet — capability covered by Gateway tests with fixtures.
- SSE: AI Service `POST /api/v1/ai/stream` and `/api/v1/ai/chat/stream` proxied without response buffering (`STREAM_TIMEOUT`).
