# Contract Drift Policy

W4 enforces drift checks between **stable public routes** and OpenAPI specifications.

## Stable route registry

Each service exports `*StableRoutes` from `src/openapi/spec.ts`. Contract tests compare:

```text
mounted stable route ↔ OpenAPI method/path
```

## Fail conditions

Tests fail when:

- A stable route is mounted but missing from OpenAPI
- OpenAPI documents a stable route that is not in the registry (orphan)
- HTTP method differs
- Duplicate `operationId` values appear in a spec or merged Gateway spec

## Out of scope

- Internal/debug routes (for example Kernel `/test-tools`)
- Unmounted legacy files (`auth-service/src/routes/session.routes.ts`)
- Deferred Admin / Analytics / Notification
- Workspace billing/audit routes not in stable registry

## Commands

```powershell
pnpm --filter @nexus/openapi test
pnpm --filter @nexus/api-gateway test
pnpm --filter @nexus/auth-service test
```

See `backend/openapi/tests/openapi.spec.ts` and per-service `tests/unit/openapi.spec.ts` (auth) for implementations.
