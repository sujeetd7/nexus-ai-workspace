# ADR-003: Backend Microservices with Express + Prisma

## Status
Accepted

## Date
2024-01-22

## Context
The backend must serve multiple client types (web, mobile, AI agents) with
different SLAs. We need clear service boundaries, independent deployability,
and a robust ORM for PostgreSQL.

## Decision
Adopt an Express-based microservices architecture with Prisma ORM for
PostgreSQL. Services communicate via REST over the API Gateway and async events
via Redis pub/sub + BullMQ queues. MongoDB is used for unstructured data
(chat history, activity logs).

## Consequences
- Clear domain boundaries; independent scaling
- Prisma migrations are shared via @nexus/database package
- More infrastructure complexity vs monolith
- Service mesh needed at scale (Istio / Linkerd)

## Alternatives Considered
- NestJS: considered – Express chosen for lower abstraction, full control
- Fastify: considered – Express chosen for ecosystem maturity
- GraphQL gateway: deferred to v2
