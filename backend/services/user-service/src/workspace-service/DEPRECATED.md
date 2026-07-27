# DEPRECATED — Embedded Workspace Duplicate (W2.2B quarantine)

**Status:** Unreachable from User Service production runtime. Scheduled for **W11 retirement**.

## Canonical owner

Production Workspace Service:

```text
backend/services/workspace-service
```

## This tree

```text
backend/services/user-service/src/workspace-service/**
```

is a historical duplicate. It is:

- not imported by User Service `app.ts` / routes;
- not mounted on User Service HTTP;
- excluded from User Service TypeScript production compilation (`tsconfig.json` `exclude`);
- not a public export of `user-service`.

Do not repair memory repositories here. Do not treat this tree as canonical.
Do not deep-import canonical Workspace Service internals from User Service.

## Mandatory follow-up

- **W11:** delete this duplicate tree after confirming no tooling/scripts reference it.
