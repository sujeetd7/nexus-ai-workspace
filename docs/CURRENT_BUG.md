# CURRENT BUG

Service:
workspace-service

---

## ERROR

```typescript
Property 'workspace' does not exist on type PrismaClient
```

---

## VERIFIED

✓ Workspace table exists
✓ WorkspaceMember table exists
✓ Migration exists
✓ prisma generate succeeds
✓ prisma db pull succeeds

---

## OBSERVATION

Generated client:

```text
root/node_modules/@prisma/client/index.d.ts
```

contains only stub exports.

No:

```text
WorkspaceDelegate
workspace
workspaceMember
```

generated.

---

## ENVIRONMENT

- Windows
- pnpm workspace
- Prisma 5.22
- PostgreSQL
