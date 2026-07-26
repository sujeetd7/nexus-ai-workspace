# Backend Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** Backend Engineers

---

## Purpose

This document defines the backend architecture for Nexus AI Workspace. It covers the microservices decomposition, API gateway design, inter-service communication, data ownership, authentication and authorization mechanisms, background job processing, and operational concerns.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Microservices Catalog](#2-microservices-catalog)
3. [API Gateway](#3-api-gateway)
4. [Service Communication](#4-service-communication)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Data Ownership](#6-data-ownership)
7. [Background Jobs](#7-background-jobs)
8. [Shared Packages](#8-shared-packages)
9. [Configuration Management](#9-configuration-management)
10. [Observability](#10-observability)
11. [Error Handling](#11-error-handling)
12. [Testing Strategy](#12-testing-strategy)
13. [Architectural Tradeoffs](#13-architectural-tradeoffs)
14. [Future Improvements](#14-future-improvements)

---

## 1. Architecture Overview

The backend is organized as a **Node.js microservices monorepo** under `backend/`. Each service is independently deployable, owns its domain data, and communicates over well-defined HTTP APIs and event contracts.

```
backend/
├── services/
│   ├── api-gateway/            # Reverse proxy, auth middleware, rate limiting
│   ├── auth-service/           # JWT, refresh tokens, OAuth, RBAC
│   ├── chat-service/           # Real-time chat, threads, WebSocket
│   ├── document-service/       # File upload, parsing, AI enrichment
│   ├── user-service/           # User profiles, preferences, search
│   ├── workspace-service/      # Teams, workspaces, membership
│   └── notification-service/   # Push, email, in-app notifications
├── packages/
│   ├── auth/                   # Shared JWT utilities, RBAC helpers
│   ├── cache/                  # Redis client wrapper, cache decorators
│   ├── database/               # Prisma client, migrations, seed utilities
│   ├── events/                 # Event bus, typed event publishers/subscribers
│   ├── logger/                 # Pino logger with correlation IDs
│   └── queue/                  # BullMQ queue factories, job base class
└── config/
    ├── typescript/             # Shared tsconfig
    └── eslint/                 # Shared ESLint config
```

---

## 2. Microservices Catalog

### API Gateway

| Attribute      | Detail                                                           |
| -------------- | ---------------------------------------------------------------- |
| Responsibility | Request routing, auth validation, rate limiting, SSL termination |
| Port           | 4000                                                             |
| Technology     | Express + http-proxy-middleware                                  |
| Auth           | Validates JWT; passes decoded claims downstream                  |
| Rate Limiting  | Per-user and per-IP via Redis sliding window                     |

### Auth Service

| Attribute      | Detail                                                                               |
| -------------- | ------------------------------------------------------------------------------------ |
| Responsibility | User authentication, token lifecycle, OAuth, RBAC                                    |
| Port           | 4001                                                                                 |
| Technology     | Express + Prisma + bcrypt                                                            |
| Database       | PostgreSQL (users, roles, sessions)                                                  |
| Key Endpoints  | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/register` |

### Chat Service

| Attribute      | Detail                                                          |
| -------------- | --------------------------------------------------------------- |
| Responsibility | Chat threads, message persistence, real-time WebSocket delivery |
| Port           | 4002                                                            |
| Technology     | Express + Socket.io + BullMQ                                    |
| Database       | MongoDB (threads, messages)                                     |
| Key Features   | Typing indicators, read receipts, AI response integration       |

### Document Service

| Attribute      | Detail                                                         |
| -------------- | -------------------------------------------------------------- |
| Responsibility | File upload, storage, parsing, metadata, AI enrichment trigger |
| Port           | 4003                                                           |
| Technology     | Express + Multer + LlamaParse client                           |
| Database       | MongoDB (document metadata) + S3 (file storage)                |
| Key Features   | PDF/DOCX/Markdown parsing, RAG indexing trigger                |

### User Service

| Attribute      | Detail                                     |
| -------------- | ------------------------------------------ |
| Responsibility | User profiles, preferences, avatar, search |
| Port           | 4004                                       |
| Technology     | Express + Prisma                           |
| Database       | PostgreSQL (user profiles, preferences)    |

### Workspace Service

| Attribute      | Detail                                                  |
| -------------- | ------------------------------------------------------- |
| Responsibility | Workspace and team management, membership, billing tier |
| Port           | 4005                                                    |
| Technology     | Express + Prisma                                        |
| Database       | PostgreSQL (workspaces, members, roles)                 |

### Notification Service

| Attribute      | Detail                                      |
| -------------- | ------------------------------------------- |
| Responsibility | Email, push, and in-app notifications       |
| Port           | 4006                                        |
| Technology     | Express + BullMQ + SendGrid                 |
| Database       | MongoDB (notification records, preferences) |
| Queue          | `notifications` BullMQ queue                |

---

## 3. API Gateway

### Responsibilities

- Single entry point for all client traffic
- JWT validation (verify signature, expiry, revocation check)
- Route proxying to downstream services
- Rate limiting (per-user and per-IP)
- Request/response logging with correlation IDs
- CORS policy enforcement
- Request size limits

### Routing Table

| Path Prefix          | Upstream Service          | Strip Prefix |
| -------------------- | ------------------------- | ------------ |
| `/api/auth`          | auth-service:4001         | No           |
| `/api/chat`          | chat-service:4002         | No           |
| `/api/documents`     | document-service:4003     | No           |
| `/api/users`         | user-service:4004         | No           |
| `/api/workspace`     | workspace-service:4005    | No           |
| `/api/notifications` | notification-service:4006 | No           |
| `/api/ai`            | ai-platform:8000          | No           |
| `/ws`                | chat-service:4002         | No           |

### Middleware Stack (in order)

1. `helmet()` — HTTP security headers
2. `cors()` — CORS with allowlist
3. `requestId()` — Attach correlation ID
4. `rateLimiter()` — Redis-backed sliding window
5. `jwtValidate()` — Verify and decode JWT
6. `requestLogger()` — Structured request log
7. `proxy()` — Route to upstream

---

## 4. Service Communication

### Synchronous (HTTP)

- Internal service-to-service calls use HTTP with service tokens
- Service tokens are short-lived JWTs signed with a shared internal secret
- No external-facing services communicate directly — all traffic routes through the gateway

### Asynchronous (Events)

- Domain events published via the shared `events` package
- Current backing: BullMQ queues in Redis
- [TODO: Evaluate Apache Kafka for high-volume event streaming]

### Event Taxonomy

| Event                    | Producer          | Consumers                                         |
| ------------------------ | ----------------- | ------------------------------------------------- |
| `user.created`           | auth-service      | user-service, notification-service                |
| `user.deleted`           | auth-service      | user-service, workspace-service, document-service |
| `message.created`        | chat-service      | notification-service, ai-platform                 |
| `document.uploaded`      | document-service  | ai-platform (RAG indexing)                        |
| `workspace.member.added` | workspace-service | notification-service                              |
| `ai.response.generated`  | ai-platform       | chat-service                                      |

---

## 5. Authentication & Authorization

### JWT Strategy

- **Access Token:** HS256 signed, 15-minute expiry, in-memory on client
- **Refresh Token:** UUID stored in `httpOnly` cookie, 7-day expiry, stored in Redis
- Token rotation on every refresh
- Revocation list in Redis (`blocklist:token:<jti>`)

### RBAC Model

| Role              | Scope        | Key Permissions                        |
| ----------------- | ------------ | -------------------------------------- |
| `super_admin`     | Platform     | Full access to all resources           |
| `org_admin`       | Organization | Manage users, workspaces, billing      |
| `workspace_admin` | Workspace    | Manage members, settings, integrations |
| `member`          | Workspace    | Read/write own data, use AI features   |
| `viewer`          | Workspace    | Read-only access                       |
| `ai_service`      | Internal     | AI platform service calls              |

### Permission Enforcement

- Gateway validates token authenticity and expiry
- Each service validates role claims from decoded JWT
- Shared `auth` package provides `requireRole()` and `requirePermission()` middleware
- Row-level security for multi-tenant data via workspace ID scoping

---

## 6. Data Ownership

Each service owns its data exclusively. Cross-service data access must go through the service's API.

| Service              | Primary Store | Schema/Collection                           |
| -------------------- | ------------- | ------------------------------------------- |
| auth-service         | PostgreSQL    | `users`, `sessions`, `roles`, `permissions` |
| user-service         | PostgreSQL    | `profiles`, `preferences`, `avatar`         |
| workspace-service    | PostgreSQL    | `workspaces`, `memberships`, `invitations`  |
| chat-service         | MongoDB       | `threads`, `messages`, `reactions`          |
| document-service     | MongoDB       | `documents`, `versions`, `annotations`      |
| notification-service | MongoDB       | `notifications`, `notification_preferences` |

### Prisma Schema Location

- Shared Prisma schema: `backend/packages/database/prisma/schema.prisma`
- Each service that uses PostgreSQL references this via workspace package
- MongoDB models defined with Mongoose in respective service codebases

---

## 7. Background Jobs

### Technology: BullMQ + Redis

All background processing uses BullMQ queues via the shared `queue` package.

| Queue                 | Producer         | Consumer               | Job Types                         |
| --------------------- | ---------------- | ---------------------- | --------------------------------- |
| `notifications`       | Any service      | notification-service   | email, push, in-app               |
| `document-processing` | document-service | ai-platform            | parse, chunk, embed               |
| `ai-tasks`            | Any service      | ai-platform            | agent run, RAG query              |
| `cleanup`             | Scheduled        | Any service            | token rotation, temp file cleanup |
| `audit`               | Any service      | audit-service (future) | Event recording                   |

### Job Conventions

- Jobs are idempotent — safe to retry
- Exponential backoff on failure (3 retries default)
- Dead-letter queue for failed jobs after max retries
- Job progress reported back via Redis pub/sub for real-time UI updates

---

## 8. Shared Packages

| Package           | Contents                                                  | Consumers                  |
| ----------------- | --------------------------------------------------------- | -------------------------- |
| `@nexus/auth`     | JWT sign/verify, RBAC middleware, token utilities         | All services               |
| `@nexus/cache`    | Redis client singleton, TTL cache decorator, invalidation | All services               |
| `@nexus/database` | Prisma client, migration utilities, seed helpers          | PostgreSQL services        |
| `@nexus/events`   | Event publisher, subscriber, typed event schemas          | All services               |
| `@nexus/logger`   | Pino logger with request context, correlation IDs         | All services               |
| `@nexus/queue`    | BullMQ queue factory, worker base class, retry config     | Producer/consumer services |

---

## 9. Configuration Management

### Environment Variables

Each service has a `.env.example` documenting required variables. Variables are loaded via `dotenv` in development. In production, injected as Kubernetes Secrets.

### Required Variables (All Services)

```
NODE_ENV=development|production|test
PORT=<service port>
DATABASE_URL=<postgres or mongo connection string>
REDIS_URL=<redis connection string>
JWT_SECRET=<strong random secret>
INTERNAL_SERVICE_SECRET=<shared internal token secret>
LOG_LEVEL=info|debug|warn|error
```

### Sensitive Variable Policy

- Never committed to source control
- Stored in a secrets manager in production ([TODO: HashiCorp Vault or AWS Secrets Manager])
- Rotated quarterly

---

## 10. Observability

| Concern            | Implementation                                            | Status                  |
| ------------------ | --------------------------------------------------------- | ----------------------- |
| Structured logging | Pino with `@nexus/logger`                                 | [TODO: finalize format] |
| Correlation IDs    | `x-correlation-id` header propagated through all services | [TODO: implement]       |
| Health checks      | `GET /health` endpoint on every service                   | [TODO: implement]       |
| Readiness probes   | `GET /ready` (checks DB + Redis)                          | [TODO: implement]       |
| Metrics            | Prometheus `/metrics` endpoint                            | [TODO: implement]       |
| Distributed traces | OpenTelemetry SDK                                         | [TODO: implement]       |

---

## 11. Error Handling

### Standard Error Response Shape

```typescript
// Placeholder — do not implement yet
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",       // Machine-readable code
    message: "Validation failed",   // Human-readable message
    details: [ /* field errors */ ],// Optional field-level details
    correlationId: "req-abc-123",   // For support tracing
    timestamp: "2026-06-27T..."
  }
}
```

### Error Codes (Partial)

| Code               | HTTP Status | Meaning                               |
| ------------------ | ----------- | ------------------------------------- |
| `VALIDATION_ERROR` | 400         | Request body/params failed validation |
| `UNAUTHORIZED`     | 401         | Missing or invalid auth token         |
| `FORBIDDEN`        | 403         | Insufficient permissions              |
| `NOT_FOUND`        | 404         | Resource does not exist               |
| `CONFLICT`         | 409         | Resource already exists               |
| `RATE_LIMITED`     | 429         | Too many requests                     |
| `INTERNAL_ERROR`   | 500         | Unexpected server error               |
| `AI_UNAVAILABLE`   | 503         | AI provider temporarily unavailable   |

---

## 12. Testing Strategy

| Level       | Tool                  | Coverage Target             |
| ----------- | --------------------- | --------------------------- |
| Unit        | Jest                  | 80% per service             |
| Integration | Jest + Testcontainers | Key service flows           |
| Contract    | Pact (future)         | Inter-service API contracts |
| Load        | k6                    | API gateway, chat service   |

See [Testing Strategy](./testing.md) for full details.

---

## 13. Architectural Tradeoffs

| Decision                    | Benefit                               | Cost                                                 |
| --------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Microservices over monolith | Independent scaling and deployment    | Operational overhead, network latency                |
| Node.js for all backend     | Unified language with frontend        | Suboptimal for CPU-bound work (offload to Python AI) |
| Shared Prisma schema        | Single source of DB truth             | Coupling between services sharing PostgreSQL         |
| MongoDB for chat/docs       | Flexible schema for unstructured data | No ACID transactions across collections              |
| BullMQ over Kafka           | Simpler operational model             | Limited throughput at very large scale               |
| HTTP between services       | Debuggable, familiar                  | Latency vs. in-process calls                         |

---

## 14. Future Improvements

- [ ] Add API versioning strategy (`/v1`, `/v2`)
- [ ] Implement circuit breakers (opossum) for AI platform calls
- [ ] Add Kafka for high-throughput event streaming
- [ ] Introduce service mesh (Istio) for mTLS and observability
- [ ] Implement API contract testing with Pact
- [ ] Add GraphQL gateway as alternative to REST for frontend
- [ ] Row-level encryption for PII fields
- [ ] Implement full audit logging service
