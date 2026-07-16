# API Development Rules

## Source of Truth

The source of truth for every API is the actual Express routes in the codebase.

Never invent endpoints.

Never document APIs that do not exist.

---

## API Documentation

Whenever an API is:

- added
- removed
- renamed
- modified

always update BOTH files.

docs/API_CURLS.md
docs/API_STATUS.md

---

## API_CURLS.md

Must contain only implemented APIs.

Group by service.

Example:

# AI-KERNEL

## Execute

Method:
POST

URL:
/api/v1/kernel/execute

Headers:
Content-Type: application/json

Body:

{
...
}

curl ...

---

## API_STATUS.md

Maintain a complete API inventory.

Columns:

| Service | Method | Endpoint | Implemented | Tested | Working | Depends On | Notes |

Working values:

- Yes
- No
- Partial

---

## Testing

Every newly added API must be tested.

Update API_STATUS.md after testing.

Never mark an API as Working unless it has been tested.

---

## Integration Rules

When AI-Kernel integrates another service:

- verify the downstream service is running
- verify direct API
- verify Kernel proxy
- verify end-to-end response

Record results in API_STATUS.md.

---

## Do Not

Do not invent routes.

Do not invent sample responses.

Do not document future APIs.

Only use implemented code.

---

## Services

Current services:

- AI-Service
- AI-Kernel
- Prompt-Service
- Document-Service
- Workspace-Service
- Chat-Service
- User-Service
- Agent-Service
- Auth-Service
- Analytics-Service
- Notification-Service
- Admin-Service

---

## Maintenance Rule

Every pull request that changes an API must update:

- docs/API_CURLS.md
- docs/API_STATUS.md

Documentation is part of the implementation.
