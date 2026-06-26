# ADR-0004: Polyglot Database Strategy

> **ID:** ADR-0004
> **Title:** Polyglot Database Strategy
> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Principal Staff Engineer, Backend Lead, Data Lead
> **Supersedes:** N/A
> **Superseded By:** N/A

---

## Context

Nexus AI Workspace stores multiple categories of data with fundamentally different characteristics: structured relational data (users, permissions), flexible document data (messages, documents), ephemeral high-performance state (sessions, queues), and high-dimensional vector data (embeddings for AI search).

We must select database technologies that fit each data type rather than forcing all data into a single database paradigm. The wrong choice here has cascading effects on performance, schema flexibility, operational complexity, and developer experience.

### Data Categories

| Category | Examples | Access Pattern |
|---|---|---|
| Structured relational | Users, permissions, workspaces, memberships | Complex joins, ACID transactions |
| Flexible documents | Chat messages, documents, notifications | High write throughput, flexible schema |
| Ephemeral / high-speed | Sessions, tokens, rate limits, queues | Sub-millisecond, TTL-based |
| Vector embeddings | Document chunks, memory | Semantic similarity search |

### Forces at Play

- Relational data (auth, permissions) requires ACID guarantees and foreign key integrity
- Chat messages have a flexible, evolving schema with nested reactions and attachments
- Token validation must be sub-millisecond; traditional SQL is too slow for this path
- Vector search (semantic similarity) is a specialized workload that SQL databases handle poorly
- Operational complexity increases with each additional database technology
- Local development must support all databases via Docker Compose without enterprise licenses

---

## Decision

We adopt a **polyglot persistence strategy** with four specialized databases, each selected for its fit to a specific data category.

### Database Assignments

| Technology | Use Case | Services |
|---|---|---|
| **PostgreSQL 16** | Structured relational, ACID-required | auth, user, workspace |
| **MongoDB 7** | Flexible document, high write throughput | chat, document, notification |
| **Redis 7** | Cache, sessions, queues, pub/sub | All services |
| **ChromaDB** | Vector embeddings, semantic search | AI platform |

### PostgreSQL — Structured Relational Data

**Rationale:**
- Users, sessions, roles, permissions, workspaces, and memberships are highly relational
- Membership changes require ACID transactions (add member + audit log must be atomic)
- Prisma ORM provides type-safe query building, migration tooling, and excellent TypeScript integration
- PostgreSQL's JSONB column type provides schema flexibility where needed without abandoning relational structure

**Used by:** auth-service, user-service, workspace-service

**Migration strategy:** Prisma Migrate with numbered, audited migration files

### MongoDB — Flexible Document Data

**Rationale:**
- Chat messages have a genuinely evolving schema: reactions (arrays of users), attachments (varied types), AI metadata (added later without breaking existing documents), thread references
- Document metadata similarly has flexible AI-enrichment fields added over time
- MongoDB's document model eliminates the impedance mismatch for nested, array-heavy data
- High write throughput suits the real-time messaging workload

**Used by:** chat-service, document-service, notification-service

**Schema evolution:** Additive changes via application-level versioning; destructive changes require migration scripts

### Redis — Cache, Sessions, Queues

**Rationale:**
- JWT token validation and refresh token management requires sub-millisecond lookup
- Rate limiting sliding window algorithms are native Redis operations (INCR + EXPIRE)
- BullMQ (background job processing) is natively backed by Redis
- Socket.io horizontal scaling via Redis pub/sub adapter
- TTL support is a first-class Redis feature, eliminating manual cleanup jobs

**Used by:** All services

**Data persistence:** RDB + AOF enabled for session durability

### ChromaDB — Vector Embeddings

**Rationale:**
- Semantic similarity search is the core mechanism for RAG (Retrieval-Augmented Generation)
- ChromaDB is purpose-built for embedding storage and cosine similarity search
- Local-first: runs without external cloud dependencies during development
- Open source: no per-vector pricing model
- Python-native client aligns with the AI platform's Python stack

**Used by:** AI platform (RAG service, agent memory)

**Scale consideration:** ChromaDB is appropriate for millions of vectors. Beyond that, migration to Pinecone or Weaviate should be evaluated.

---

## Considered Alternatives

### Alternative 1: Single Database (PostgreSQL Only)

**Description:** Use PostgreSQL for all data, including chat messages (stored as JSON), sessions (stored in a sessions table), and vectors (using pgvector extension).

**Pros:**
- Single operational surface
- ACID transactions across all data
- Single backup strategy
- Developers learn one query language

**Cons:**
- `pgvector` semantic search quality and performance lags behind purpose-built vector DBs
- JSON columns in PostgreSQL sacrifice relational benefits without gaining MongoDB's indexing flexibility
- Session table in PostgreSQL is significantly slower than Redis for token validation
- High-frequency chat writes compete with relational queries on shared connection pool

**Reason rejected:** Forcing all data into PostgreSQL degrades performance at scale and creates schema friction for naturally document-shaped data. The pgvector extension is promising but not yet mature enough for production RAG workloads at our target scale.

### Alternative 2: PostgreSQL + Redis (No MongoDB)

**Description:** Use PostgreSQL for all persistent data, Redis for sessions and queues.

**Pros:**
- Two technologies instead of four
- PostgreSQL JSONB handles flexible documents adequately
- Reduces operational complexity

**Cons:**
- PostgreSQL JSONB lacks MongoDB's rich array query operators (crucial for chat reactions, member arrays)
- Schema migrations for evolving chat message formats become complex in SQL
- Write throughput for real-time chat under high concurrency is worse than MongoDB

**Reason rejected:** For chat and document workloads, MongoDB's document model provides a meaningful developer productivity and performance advantage that justifies the operational cost of a second database.

### Alternative 3: PostgreSQL + MongoDB + Redis + Pinecone (Cloud Vector DB)

**Description:** Replace ChromaDB with Pinecone for production-grade vector search.

**Pros:**
- Pinecone offers higher scalability and managed infrastructure
- Better performance for large-scale (>10M vectors) semantic search
- Fully managed — no operational burden

**Cons:**
- Per-vector pricing is a significant cost at enterprise scale
- Cannot run locally without internet access (breaks offline development)
- Vendor lock-in for a core AI capability

**Reason rejected in Phase 1-2:** ChromaDB is sufficient for our initial scale, runs locally, and is free. We document Pinecone as the migration path when ChromaDB reaches its scaling limits (ADR to be written at that time).

### Alternative 4: DynamoDB (AWS-native)

**Description:** Use DynamoDB for document storage instead of MongoDB.

**Pros:**
- Fully managed, serverless pricing model
- Native AWS integration

**Cons:**
- Local development requires DynamoDB Local (more setup friction)
- Query model is more limited than MongoDB for our access patterns
- Vendor lock-in to AWS

**Reason rejected:** MongoDB's richer query model, superior local development experience, and cloud-agnostic nature better fit the platform's requirements.

---

## Consequences

### Positive

- Each database is optimized for its workload — better performance across all domains
- MongoDB's flexible schema enables rapid evolution of chat and document features without migrations
- Redis ensures sub-millisecond auth performance
- ChromaDB enables local AI development without cloud dependencies

### Negative

- **Operational complexity** — four database technologies to operate, monitor, back up, and upgrade
- **No cross-database transactions** — workflows involving both PostgreSQL and MongoDB entities must handle eventual consistency
- **Backup complexity** — four separate backup strategies required
- **Onboarding** — new engineers must understand four database paradigms

### Mitigations

- Docker Compose provides all four databases in one `docker-compose up` command for local development
- Each database has a dedicated runbook for backup, restore, and failover
- Shared packages (`@nexus/database`, `@nexus/cache`) abstract database client initialization

### Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| ChromaDB scaling limits | Medium | Migration path to Pinecone documented |
| Increased operational burden for small team | Medium | Managed cloud versions in production (RDS, Atlas, ElastiCache) |
| Cross-service data consistency bugs | Low | Eventual consistency patterns, compensating transactions |

---

## Related Decisions

- [ADR-0002: Microservices Decomposition](./0002-microservices.md)
- [ADR-003: Backend Microservices + Express + Prisma](./ADR-003-backend-microservices-express-prisma.md)
- [Database Architecture](../database.md)
