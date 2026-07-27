# W3 Technical Debt / Notes — Canonical Gateway

## Resolved in W3

- Canonical Gateway packaged as `@nexus/api-gateway` (`backend/gateway/api-gateway`)
- Duplicate Express gateway retired (`backend/services/api-gateway` → `@nexus/api-gateway-retired`, workspace-excluded)
- Document (3004) / AI Kernel (3010) port conflict resolved
- Invitation accept no longer trusts body `userId`
- Admin / Analytics / Notification production proxies removed

## Deferred to W4

- Full Swagger / OpenAPI aggregation across product services
- Gateway `/docs` surface (plugin left unregistered to avoid misleading empty docs)

## Deferred product services (no Gateway routes)

- Admin Service
- Analytics Service
- Notification Service

## Notes

- Chat public Gateway prefix is `/api/v1/chat` rewritten to Chat Service `/api/v1/*`
- AI public Gateway prefix is `/api/v1/ai` rewritten to AI Service `/api/v1/*`
- Document Service has no stable multipart upload route; Gateway multipart proxy is tested via fixtures only
- Chat Service does not expose SSE; SSE coverage targets AI stream routes
