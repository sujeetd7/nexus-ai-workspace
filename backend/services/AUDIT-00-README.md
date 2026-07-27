# Backend Audit Fix Tracker

Generated from architecture + layer + production-readiness audits.

**Overall (audit estimate):** ~35% complete · ~65% remaining

---

## Files in this folder

| File                                                             | Contents                                        |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| [AUDIT-01-CRITICAL-BLOCKERS.md](./AUDIT-01-CRITICAL-BLOCKERS.md) | Must-fix before production                      |
| [AUDIT-02-DUPLICATES.md](./AUDIT-02-DUPLICATES.md)               | Duplicate trees, files, clients                 |
| [AUDIT-03-WIRING.md](./AUDIT-03-WIRING.md)                       | Exists but not connected                        |
| [AUDIT-04-DEAD-CODE.md](./AUDIT-04-DEAD-CODE.md)                 | Unused modules / empty stubs                    |
| [AUDIT-05-FAKE-PLACEHOLDERS.md](./AUDIT-05-FAKE-PLACEHOLDERS.md) | Mocks, placeholders, incomplete features        |
| [AUDIT-06-PER-SERVICE.md](./AUDIT-06-PER-SERVICE.md)             | Per-service layer checklist                     |
| [AUDIT-07-AUTH-SERVICE.md](./AUDIT-07-AUTH-SERVICE.md)           | Auth Service capability matrix, batch plan, DoD |

## Suggested fix order

1. **Auth Service completion** (see [AUDIT-07-AUTH-SERVICE.md](./AUDIT-07-AUTH-SERVICE.md)) — refresh reuse defects first, then RBAC harden, lifecycle closeout, security hardening, gateway closeout
2. Critical blockers (mocks, gateway ports/auth, invitation, kernel Prisma/MCP decision)
3. Wiring (validation, swagger, mounts, route order)
4. Delete or quarantine dead trees (nested workspace, unused agents, stub gateway)
5. Per-service hardening (DI optional later; fail-closed + auth first)

## Notes

- Evidence came from actual code inspection; ignore comments/TODOs as requirements unless listed as open work.
- Mark items `[x]` when fixed; keep file paths as the source of truth.
