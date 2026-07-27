# API Authentication

## Bearer scheme

All protected endpoints use HTTP Bearer JWT:

```yaml
type: http
scheme: bearer
bearerFormat: JWT
```

In Gateway Swagger UI, click **Authorize** and enter:

```text
Bearer <access_token>
```

Some Swagger UI builds accept only the raw token; if authorization fails, try the `Bearer ` prefix.

## Public vs protected routes

| Area | Public examples | Protected examples |
| ---- | --------------- | ------------------ |
| Auth | `POST /api/v1/auth/login`, `register`, `refresh`, `forgot-password` | `logout`, `sessions`, `profile/me` (direct auth only) |
| Users / Workspaces / Documents / Prompts / Chat / AI / Agents / Kernel | health where documented | CRUD and execution routes |

Gateway enforces Bearer auth on proxied routes except Auth public matchers and documented public health endpoints.

## Workspace scope

Workspace membership and roles are enforced by each service. OpenAPI descriptions note when `workspaceId` is required in path, query, or body, or derived from verified identity context.

## Error envelope

Normalized service errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": [{ "field": "email", "message": "Invalid email" }]
  },
  "requestId": "…",
  "timestamp": "…"
}
```

Gateway upstream failures:

```json
{
  "error": {
    "code": "upstream_unavailable",
    "message": "Upstream service unavailable",
    "correlationId": "…"
  }
}
```

Do not embed tokens or credentials in documentation or examples.
