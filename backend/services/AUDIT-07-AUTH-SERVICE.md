# Auth Service Audit — Continuation Baseline

**Branch:** `refactor/execution-cleanup`  
**Package:** `@nexus/auth-service`  
**Canonical gateway:** `backend/gateway/api-gateway`  
**Audit date:** 2026-07-27  
**Scope:** Inspection + planning only (no implementation in this pass)

**Overall Auth readiness (estimate):** ~55% present · ~25% partial/defective · ~20% missing

---

## Status matrix

| Capability              | Status    | Evidence                                                           | Gap                                                                                          | Recommended action                                        |
| ----------------------- | --------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Register                | Partial   | `auth.routes.ts`, `auth.service.ts#register`, `register.schema.ts` | Optional `role` on register enables privilege escalation; no password complexity             | Auth A: strip client-settable `role`; default `USER` only |
| Login                   | Partial   | `auth.service.ts#login`                                            | No `isActive` / `emailVerified` gate; emails logged on failure                               | Auth C/D: enforce account status; redact PII              |
| JWT access token        | Partial   | `tokens/access/jwt.service.ts`                                     | Hardcoded secret fallbacks; secrets logged; gateway uses different env key                   | Auth E: align secrets; remove console secret dumps        |
| Refresh token           | Partial   | `auth.service.ts#refresh`, Session model                           | Rotation + hash store exist; family/`replacedByToken` unused; not transactional              | Auth B: harden rotation model                             |
| Logout                  | Partial   | `auth.routes.ts` + `logout`                                        | Requires Bearer + body `refreshToken`; throws raw `Error` if missing                         | Auth B: validate body; consistent 204/401                 |
| RBAC                    | Partial   | `authorize.middleware.ts`, `rbac.ts`, `admin.routes.ts`            | Role guard only; `ROLE_PERMISSIONS` unused; register role hole                               | Auth A: permission guard + close escalation               |
| Protected routes        | Partial   | `/profile/me`, `/admin/dashboard`, session routes                  | `user.routes.ts` unmounted; inconsistent prefixes (`/profile`, `/admin` vs `/api/v1/auth`)   | Auth A: mount or delete; normalize prefixes               |
| Token persistence       | Complete  | `Session.refreshTokenHash`, `hash.service.ts` sha256               | —                                                                                            | Keep; never store raw tokens                              |
| Rotation                | Defective | `refresh` revokes then creates new session                         | No family link; `replacedByToken` never written; race-prone                                  | Auth B: transactional rotate + family                     |
| Reuse detection         | Defective | `findByTokenHash` = findUnique **without** `revoked:false`         | Reused rotated token can re-issue instead of family revoke                                   | Auth B: active-only lookup + replay revoke                |
| Revocation              | Partial   | `revoke`, `revokeUserSessions`, logout-all                         | Per-session + all-user works; no family-scoped revoke; cleanup job unused                    | Auth B: family revoke + scheduled `deleteExpired`         |
| Email verification      | Partial   | verify/resend flows + Prisma model                                 | Routes lack Zod validate; SMTP uses verify template for mixed flows                          | Auth C: wire schemas; correct templates                   |
| Forgot/reset password   | Partial   | `forgotPassword` / `resetPassword`                                 | Reset email calls `publishVerificationEmail` (wrong copy/URL); no rate limit                 | Auth C/D: dedicated reset mail + limits                   |
| Password change         | Missing   | `AuditEvent.PASSWORD_CHANGED` only                                 | No authenticated change-password endpoint                                                    | Auth C: add change + revoke sessions                      |
| Session management      | Partial   | Dual mounts in `app.ts`                                            | Duplicate session APIs (`auth.routes` vs `session.routes`); `current` always false           | Auth B: single surface; mark current                      |
| Rate limiting           | Missing   | No middleware/deps                                                 | Auth endpoints unprotected from brute force beyond lockout                                   | Auth D: endpoint-specific limits                          |
| Account lockout         | Partial   | `failedLoginAttempts` + `lockedUntil`                              | Works on password mismatch; lockout bypass via other endpoints; 423 reveals lock state       | Auth D: generic responses where required                  |
| Audit logging           | Partial   | `security/audit/audit.service.ts`                                  | Console only; Prisma `AuditLog` unused                                                       | Auth D/C: persist via repository                          |
| API Gateway integration | Partial   | `gateway/.../auth.proxy.ts`                                        | Proxy OK; edge auth unwired; `JWT_SECRET` ≠ `JWT_ACCESS_SECRET`; stub `services/api-gateway` | Auth E: wire + secret parity; quarantine stub             |
| Swagger/OpenAPI         | Partial   | `/docs` + JSDoc on some routes                                     | Incomplete ops (verify, sessions, etc.)                                                      | Auth E: reconcile all routes                              |
| Unit/integration tests  | Defective | `tests/unit`, `tests/integration`                                  | Unit ctor arity wrong; integration imports function not app                                  | Auth A–E: fix harness + cover matrix                      |

---

## Adjusted batch plan

Do **not** rebuild existing register/login/JWT/session scaffolding.

| Batch               | Focus                                | Why (evidence-adjusted)                                                             | Status                     |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------- |
| **Auth B′ (first)** | Refresh reuse + rotation correctness | Capability exists but is **defective** — security blocker                           | **Implemented 2026-07-27** |
| **Auth A**          | RBAC harden + route protection       | Middleware exists; close escalation + mount consistency                             | Next                       |
| **Auth C**          | Lifecycle closeout                   | Verify/reset largely present; add password change + status gates + mail correctness | Pending                    |
| **Auth D**          | Hardening                            | Rate limit missing; PII/token logging defective; password policy weak               | Pending                    |
| **Auth E**          | Gateway + closeout                   | Proxy exists; JWT env mismatch; swagger/docs/tests                                  | Pending                    |

---

## Auth B′ completion notes (2026-07-27)

Implemented in place (no schema migration, no `familyId`):

- Active lookup: `findActiveByTokenHash` (`revoked=false`, `expiresAt > now`)
- Historical lookup: `findAnyByTokenHash`
- Transactional `rotateSession` with conditional `updateMany` + create; links `replacedByToken` to **new refresh token hash**
- Replay / rotation conflict → revoke **ALL active sessions for user** (`revocationScope: ALL_USER_SESSIONS`) — deliberate conservative policy without family id
- Public refresh errors stay generic `INVALID_REFRESH_TOKEN` (no replay leak in response body)
- Duplicate `session.routes` unmounted; canonical session APIs remain on `auth.routes`
- Token/secret console dumps removed from refresh/login JWT path
- Test harness repaired; refresh/replay/logout unit coverage added

### Status matrix updates (B′)

| Capability             | Prior     | After B′                                                      |
| ---------------------- | --------- | ------------------------------------------------------------- |
| Token persistence      | Complete  | Complete                                                      |
| Rotation               | Defective | Partial → **Complete** (transactional)                        |
| Reuse detection        | Defective | **Complete** (generic 401 + all-user revoke)                  |
| Revocation             | Partial   | Partial (all-user on replay; no family)                       |
| Session management     | Partial   | Partial (duplicate mount removed; `current` flag still false) |
| Unit/integration tests | Defective | Partial (harness + B′ cases; full matrix still open)          |

### Residual B′-adjacent debt

- No `familyId` — replay revokes all user sessions
- `session.routes.ts` file retained but unmounted
- Register role hole, gateway JWT alignment, rate limits → later batches
- Manual scenario #4: expect generic `INVALID_REFRESH_TOKEN` (not `TOKEN_REPLAY_DETECTED` in public body)

---

## Mandatory fixes (pre-production)

1. [x] Fix refresh reuse detection (`findActiveByTokenHash` + replay containment).
2. [x] Stop logging raw refresh tokens / JWT secrets (`auth.service.ts`, `jwt.service.ts`).
3. [ ] Remove client-controlled `role` from register schema. (Auth A)
4. [ ] Align gateway `JWT_SECRET` with auth `JWT_ACCESS_SECRET` (or shared claim verifier). (Auth E)
5. [ ] Load root `.env` explicitly (JWT secrets currently absent from root `.env`). (Auth E)
6. [x] Repair/replace broken unit + integration tests before expanding coverage.

---

## Validation commands (user-run)

```powershell
pnpm --filter @nexus/auth-service lint
pnpm --filter @nexus/auth-service typecheck
pnpm --filter @nexus/auth-service test
pnpm --filter @nexus/auth-service build
```

Gateway (canonical):

```powershell
pnpm --filter api-gateway build
```

Note: both `backend/gateway/api-gateway` and `backend/services/api-gateway` are named `api-gateway`; run from the Fastify package under `backend/gateway/api-gateway`.

---

## Definition of Done (Auth completion)

- [x] Reused rotated refresh token → reject + revoke all user sessions (conservative scope); no new session issued
- [ ] Register cannot self-assign `ADMIN`/`MANAGER`
- [ ] Protected routes return 401 vs 403 correctly
- [ ] Password change + reset revoke all sessions
- [x] No secrets/tokens in Auth refresh/login JWT console path (broader PII/Swagger still open)
- [ ] Gateway verifies same access-token secret/claims as Auth
- [ ] Lint, typecheck, test, build green for `@nexus/auth-service`
- [ ] Manual API scenarios below pass

## Manual API scenarios

1. Register → 201 + tokens
2. Login → 200 + tokens
3. Refresh → new pair; old refresh rejected on reuse
4. Reused refresh after rotate → 401 `INVALID_REFRESH_TOKEN` + **all active sessions for that user** revoked
5. After replay, latest refresh token from the stolen rotation also fails (all-user revoke)
6. Logout current → 204; refresh of that token fails
7. Logout all (`DELETE /api/v1/auth/sessions`) → all sessions revoked
8. `GET /profile/me` with Bearer → 200
9. `GET /admin/dashboard` as USER → 403; as ADMIN → 200
10. Verify email / resend → generic where appropriate
11. Forgot → generic message; reset → login with new password; old sessions dead
12. Failed logins → lockout after `AUTH_MAX_FAILED_LOGIN_ATTEMPTS`
