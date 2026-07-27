# RETIRED — Duplicate API Gateway

**Status:** Retired (W3)

**Canonical production Gateway:**

```text
backend/gateway/api-gateway
package: @nexus/api-gateway
```

## Why retired

This Express skeleton under `backend/services/api-gateway` was a non-production duplicate.
It contained only health middleware stubs and empty TODO route registration — no unique
production proxy, authentication, or upstream behavior.

## Disposition (W3)

- Excluded from the pnpm workspace (`!backend/services/api-gateway`)
- Package renamed to `@nexus/api-gateway-retired`
- `dev` / `build` / `start` / `test` scripts refuse to run
- Do not migrate empty TODO code
- Do not start this package as a second Gateway

## Do not use

```powershell
# These must not resolve/start production traffic:
pnpm --filter api-gateway ...
pnpm --filter @nexus/api-gateway-retired ...
```

Use only:

```powershell
pnpm --filter @nexus/api-gateway dev
pnpm --filter @nexus/api-gateway start
```
