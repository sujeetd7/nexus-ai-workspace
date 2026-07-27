# Nexus API Documentation

Canonical API portal: **Gateway Swagger UI** at `http://localhost:3000/docs`.

| Resource | URL |
| -------- | --- |
| Gateway Swagger UI | `http://localhost:3000/docs` |
| Gateway OpenAPI JSON | `http://localhost:3000/docs/json` |
| Service index | `http://localhost:3000/docs/services` |

## Service direct specifications

| Service | Direct JSON spec | Port |
| ------- | ---------------- | ---- |
| Auth | `http://localhost:3001/docs/json` | 3001 |
| Workspace | `http://localhost:3002/docs/json` | 3002 |
| User | `http://localhost:3003/docs/json` | 3003 |
| Document | `http://localhost:3004/docs/json` | 3004 |
| Prompt | `http://localhost:3005/docs/json` | 3005 |
| Chat | `http://localhost:3006/docs/json` | 3006 |
| AI | `http://localhost:3007/docs/json` | 3007 |
| Agent | `http://localhost:3008/docs/json` | 3008 |
| AI Kernel | `http://localhost:3010/docs/json` | 3010 |

Use Gateway paths (`/api/v1/*`) for normal QA. Direct service URLs are for service-local debugging.

## Deferred capabilities

Admin, Analytics, and Notification are **not implemented**. They do not appear in active OpenAPI specifications.

## Related guides

- [AUTHENTICATION.md](./AUTHENTICATION.md)
- [QA_SWAGGER_GUIDE.md](./QA_SWAGGER_GUIDE.md)
- [STREAMING.md](./STREAMING.md)
- [SERVICE_SPEC_INVENTORY.md](./SERVICE_SPEC_INVENTORY.md)
- [CONTRACT_DRIFT.md](./CONTRACT_DRIFT.md)
