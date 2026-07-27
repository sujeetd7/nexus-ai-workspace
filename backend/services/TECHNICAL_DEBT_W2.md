# W2 Technical Debt — Runtime Contracts

## W3 (mandatory) — Invitation identity — RESOLVED in W3

**Location:** `workspace-service` invitation accept (`POST` accept)

**Resolved behavior:**

- Accept route requires Bearer access token (`authenticate` middleware).
- Subject comes from verified `JWT_ACCESS_SECRET` claims only.
- Body `userId` cannot override identity.
- Optional `email` still must match `invitation.email` when supplied.

See `TECHNICAL_DEBT_W3.md` for Gateway disposition and W4 Swagger deferral.

## W11 — Embedded Workspace duplicate retirement

**Quarantined path:** `backend/services/user-service/src/workspace-service/**`

**Canonical path:** `backend/services/workspace-service`

Excluded from User Service production TypeScript compilation. Not mounted or imported by User Service runtime. Delete in W11 after confirming no tooling references.
