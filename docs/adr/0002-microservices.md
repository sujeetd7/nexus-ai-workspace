# ADR-0002: Microservices Decomposition Strategy

> **ID:** ADR-0002
> **Title:** Microservices Decomposition Strategy
> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Principal Staff Engineer, Backend Lead, SRE Lead
> **Supersedes:** N/A
> **Superseded By:** N/A

---

## Context

We must choose the structural organization of the backend: monolith, modular monolith, or microservices. This decision has deep and lasting consequences for team organization, deployment strategy, scalability, and operational complexity.

The platform encompasses multiple distinct functional domains: authentication, real-time chat, document management, user profiles, workspace management, notifications, and AI orchestration. Each domain has different scaling characteristics, change frequency, and team ownership.

### Forces at Play

- The platform expects 10,000+ concurrent WebSocket connections for chat (scaling need)
- AI workloads (Python) require a different runtime than the main application (Node.js)
- Multiple feature teams should be able to deploy independently without coordination
- Early-stage teams may not yet have the operational maturity for full microservices
- The monorepo (established in ADR-001) allows code sharing regardless of service topology

### Technical Constraints

- Auth service handles all identity — must be highly available
- Chat service requires WebSocket; other services do not
- AI platform is Python; all other services are Node.js
- Document and AI services have bursty, resource-intensive workloads

---

## Decision

We adopt a **microservices architecture** for the backend, decomposed along domain boundaries, and deployed independently.

### Service Decomposition

| Service                | Domain                        | Language | Scaling Characteristics      |
| ---------------------- | ----------------------------- | -------- | ---------------------------- |
| `api-gateway`          | Routing, auth enforcement     | Node.js  | Linear with requests         |
| `auth-service`         | Identity, JWT, sessions       | Node.js  | Moderate, highly available   |
| `chat-service`         | Real-time messaging           | Node.js  | High — WebSocket connections |
| `document-service`     | File handling, AI enrichment  | Node.js  | Bursty — upload events       |
| `user-service`         | Profiles, preferences         | Node.js  | Low — mostly read-heavy      |
| `workspace-service`    | Teams, membership             | Node.js  | Low to moderate              |
| `notification-service` | Email, push, in-app           | Node.js  | Bursty — event-driven        |
| `ai-platform`          | Agent runtime, RAG, inference | Python   | High CPU/memory, bursty      |

### Decomposition Principles Applied

1. **Single Responsibility** — each service owns exactly one domain
2. **Data Ownership** — each service owns its data; no shared databases
3. **API Contracts** — services communicate only via versioned HTTP APIs
4. **Independent Deployability** — any service can be deployed without deploying others
5. **Technology Fit** — the AI platform uses Python; others use Node.js

### Communication Strategy

- **Synchronous:** HTTP REST for request/response operations
- **Asynchronous:** BullMQ event queues for domain events and background jobs
- **Real-Time:** Socket.io within the chat service

### Data Isolation

- PostgreSQL: auth, user, workspace services (relational, ACID)
- MongoDB: chat, document, notification services (flexible schema)
- No direct database cross-access — all cross-service data via API

---

## Considered Alternatives

### Alternative 1: Modular Monolith

**Description:** A single deployable Node.js application with strict internal module boundaries. Modules communicate in-process via well-defined interfaces.

**Pros:**

- Simpler operations (one deployment unit)
- No network latency between modules
- Easier transactions across domains
- Faster initial development

**Cons:**

- Single deployment unit means coordinated deploys
- Hard to scale individual high-load components (chat vs. auth)
- AI platform (Python) cannot live in a Node.js monolith
- Module boundaries are hard to enforce without tooling; tend to erode

**Reason rejected:** The Python AI platform is a hard blocker for a true monolith. Additionally, the distinct scaling needs of the chat service and AI platform make independent scaling a hard requirement, not an optional enhancement.

### Alternative 2: Two-Tier (Gateway + Monolith)

**Description:** An API gateway in front of a single backend monolith, with the AI platform as a separate service.

**Pros:**

- Simpler than full microservices
- Reduces operational overhead significantly

**Cons:**

- Monolith still has deployment coordination problem
- Chat service WebSocket scaling becomes awkward inside a monolith
- Technical debt accrues faster in a monolith under active development

**Reason rejected:** This is an intermediate step, not a final architecture. The scaling and team independence requirements favor full service decomposition from day one, reducing future migration risk.

### Alternative 3: Full Microservices (Chosen)

**Description:** Each domain is an independent deployable service.

**Pros:**

- Independent scaling per service
- Independent deployment per team
- Technology fit per workload (Node.js, Python)
- Failure isolation (chat service down does not affect auth)

**Cons:**

- Operational complexity (service discovery, distributed tracing, health checks)
- Network latency between services
- No cross-service ACID transactions
- More infrastructure to manage

**Reason chosen:** The scaling requirements (10k concurrent WebSocket connections), the language heterogeneity (Python AI platform), and the multi-team ownership model all favor microservices. The monorepo (ADR-001) mitigates code sharing concerns.

---

## Consequences

### Positive

- Services can be independently scaled, deployed, and owned by different teams
- AI platform can evolve independently of backend services
- Failure of one service does not cascade to all services
- Technology choices can be optimized per workload

### Negative

- **Operational overhead** — each service needs its own Dockerfile, CI pipeline, health checks, and monitoring
- **Distributed debugging** — correlated logging and distributed tracing become mandatory, not optional
- **No cross-service transactions** — workflows spanning multiple services must be designed with eventual consistency or sagas
- **Network latency** — intra-service calls add latency vs. in-process calls

### Mitigations

- Monorepo with shared packages (`@nexus/logger`, `@nexus/auth`, etc.) reduces code duplication
- Docker Compose makes local multi-service development tractable
- Structured logging with correlation IDs makes distributed debugging manageable
- Turborepo caching keeps CI build times acceptable

### Risks

| Risk                                                   | Likelihood | Mitigation                                                        |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| Services sharing a database (violating data ownership) | Medium     | Code review enforcement, no cross-service DB access policy        |
| Over-decomposition of services (microservice hell)     | Low        | Strict domain-driven decomposition, no service splits without ADR |
| Operational complexity outpacing team maturity         | Medium     | Start with Docker Compose, graduate to Kubernetes incrementally   |

---

## Implementation Notes

- All services initialized with the shared `@nexus/logger` package for correlated logging
- All services expose `/health` and `/ready` endpoints from day one
- Service-to-service calls use internal service tokens (short-lived JWTs)
- Cross-service domain events published via `@nexus/events` shared package

---

## Related Decisions

- [ADR-001: Monorepo with Turborepo](./ADR-001-monorepo-turborepo.md)
- [ADR-003: Backend Microservices + Express + Prisma](./ADR-003-backend-microservices-express-prisma.md)
- [ADR-0004: Polyglot Database Strategy](./0004-polyglot-database.md)
