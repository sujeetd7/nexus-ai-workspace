# Duplicate Implementations

Same logic / packages exist in more than one place. Remove or consolidate.

Status: `[ ]` open · `[x]` fixed

---

## Full tree duplicates

- [ ] `user-service/src/workspace-service/**` — full nested copy of workspace-service (~54 identical `.ts` files). Not imported by user-service `app.ts` / `server.ts`. Canonical service: `workspace-service/`
- [ ] `services/api-gateway/` vs `gateway/api-gateway/` — two packages named `api-gateway`. Only `gateway/api-gateway` has runnable `app.ts`/`server.ts`. Express stub under `services/api-gateway` is incomplete

## Duplicate files within a service

- [ ] `workspace-service/src/routes/workspace.routes.ts` — CRUD duplicated inline in `routes/index.ts`; this file is never imported
- [ ] `prompt-service/src/compiler/prompt.compiler.ts` — duplicate of `prompt-compiler.ts`; zero imports (live path uses `prompt-compiler.ts`)
- [ ] `auth-service/src/docs/swagger.ts` vs `auth-service/src/config/swagger/` — alternate swagger specs; `app.ts` uses config only
- [ ] `auth-service` Prisma clients — `prisma/client.ts` used by some repos; `config/prisma.client.ts` and `database/prisma.ts` unused / mixed (`@db` vs relative import in email-verification repo)

## Duplicate env / defaults

- [ ] Multiple services default `JWT_SECRET` to `"development-secret"` (`gateway`, `auth` jwt.service, `agent`, `workspace`, `user` env files)
- [ ] Nested dead copy: `user-service/src/workspace-service/src/config/env/env.ts` — same JWT default inside unused tree
