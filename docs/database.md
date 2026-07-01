# Database Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** Backend Engineers, Data Engineers

---

## Purpose

This document defines the polyglot database strategy for Nexus AI Workspace. It covers the rationale for each database technology, schema ownership, migration strategy, data access patterns, and operational concerns.

---

## Table of Contents

1. [Polyglot Strategy](#1-polyglot-strategy)
2. [Database Catalog](#2-database-catalog)
3. [PostgreSQL Schema Design](#3-postgresql-schema-design)
4. [MongoDB Collections Design](#4-mongodb-collections-design)
5. [Redis Usage Patterns](#5-redis-usage-patterns)
6. [ChromaDB Vector Store](#6-chromadb-vector-store)
7. [Data Ownership Rules](#7-data-ownership-rules)
8. [Migration Strategy](#8-migration-strategy)
9. [Backup and Recovery](#9-backup-and-recovery)
10. [Multi-Tenancy](#10-multi-tenancy)
11. [Performance Patterns](#11-performance-patterns)
12. [Data Retention and GDPR](#12-data-retention-and-gdpr)
13. [Architectural Tradeoffs](#13-architectural-tradeoffs)
14. [Future Improvements](#14-future-improvements)

---

## 1. Polyglot Strategy

Nexus AI Workspace uses **four specialized databases**, each selected for its fit to specific data characteristics and access patterns:

| Database       | Type                | Primary Use                                |
| -------------- | ------------------- | ------------------------------------------ |
| **PostgreSQL** | Relational (ACID)   | Structured, relational, transactional data |
| **MongoDB**    | Document (NoSQL)    | Flexible, hierarchical, unstructured data  |
| **Redis**      | In-memory key-value | Caching, sessions, queues, pub/sub         |
| **ChromaDB**   | Vector store        | Embeddings, semantic search                |

### Selection Criteria

```
PostgreSQL → When you need:
  ✓ ACID transactions
  ✓ Complex relational joins
  ✓ Strong consistency
  ✓ Schema enforcement
  ✓ Foreign key constraints

MongoDB → When you need:
  ✓ Variable / nested document structure
  ✓ High write throughput
  ✓ Rapid schema evolution
  ✓ Array-heavy data
  ✓ No complex cross-collection transactions

Redis → When you need:
  ✓ Sub-millisecond response time
  ✓ Time-to-live (TTL) data
  ✓ Pub/sub messaging
  ✓ Distributed locking
  ✓ Counter/rate limiting

ChromaDB → When you need:
  ✓ Semantic similarity search
  ✓ Embedding storage at scale
  ✓ Metadata-filtered vector queries
```

---

## 2. Database Catalog

| Service              | Database              | Technology | Purpose                               |
| -------------------- | --------------------- | ---------- | ------------------------------------- |
| auth-service         | `nexus_auth`          | PostgreSQL | Users, sessions, roles, permissions   |
| user-service         | `nexus_users`         | PostgreSQL | Profiles, preferences                 |
| workspace-service    | `nexus_workspace`     | PostgreSQL | Workspaces, memberships, invitations  |
| chat-service         | `nexus_chat`          | MongoDB    | Threads, messages, reactions          |
| document-service     | `nexus_documents`     | MongoDB    | Document metadata, versions           |
| notification-service | `nexus_notifications` | MongoDB    | Notifications, preferences            |
| All services         | `nexus_cache`         | Redis      | Sessions, tokens, rate limits, queues |
| AI Platform          | `nexus_vectors`       | ChromaDB   | Document embeddings, memory vectors   |

---

## 3. PostgreSQL Schema Design

Managed by **Prisma** (`backend/packages/database/prisma/schema.prisma`).

### Core Entities

#### `users` table

| Column           | Type         | Constraints                   |
| ---------------- | ------------ | ----------------------------- |
| `id`             | UUID         | PK, default gen_random_uuid() |
| `email`          | VARCHAR(255) | UNIQUE, NOT NULL              |
| `email_verified` | BOOLEAN      | DEFAULT false                 |
| `password_hash`  | VARCHAR(255) | NULLABLE (OAuth users)        |
| `created_at`     | TIMESTAMPTZ  | DEFAULT now()                 |
| `updated_at`     | TIMESTAMPTZ  | DEFAULT now()                 |
| `deleted_at`     | TIMESTAMPTZ  | NULLABLE (soft delete)        |

#### `sessions` table

| Column               | Type         | Constraints   |
| -------------------- | ------------ | ------------- |
| `id`                 | UUID         | PK            |
| `user_id`            | UUID         | FK → users.id |
| `refresh_token_hash` | VARCHAR(255) | UNIQUE        |
| `ip_address`         | INET         |               |
| `user_agent`         | TEXT         |               |
| `expires_at`         | TIMESTAMPTZ  |               |
| `revoked_at`         | TIMESTAMPTZ  | NULLABLE      |

#### `workspaces` table

| Column       | Type         | Constraints           |
| ------------ | ------------ | --------------------- |
| `id`         | UUID         | PK                    |
| `name`       | VARCHAR(255) | NOT NULL              |
| `slug`       | VARCHAR(100) | UNIQUE, NOT NULL      |
| `owner_id`   | UUID         | FK → users.id         |
| `plan`       | ENUM         | free, pro, enterprise |
| `settings`   | JSONB        |                       |
| `created_at` | TIMESTAMPTZ  |                       |

#### `workspace_members` table

| Column         | Type        | Constraints           |
| -------------- | ----------- | --------------------- |
| `id`           | UUID        | PK                    |
| `workspace_id` | UUID        | FK → workspaces.id    |
| `user_id`      | UUID        | FK → users.id         |
| `role`         | ENUM        | admin, member, viewer |
| `joined_at`    | TIMESTAMPTZ |                       |

#### `roles` and `permissions` tables

- Roles define named permission sets (RBAC)
- Permissions are fine-grained capability flags
- `user_roles` junction table associates users with roles per workspace

### Indexing Strategy (PostgreSQL)

| Table               | Index                     | Type             | Reason                |
| ------------------- | ------------------------- | ---------------- | --------------------- |
| `users`             | `email`                   | B-tree UNIQUE    | Login lookup          |
| `sessions`          | `refresh_token_hash`      | B-tree           | Token validation      |
| `sessions`          | `user_id`                 | B-tree           | List user sessions    |
| `workspace_members` | `(workspace_id, user_id)` | B-tree composite | Membership lookup     |
| `workspaces`        | `slug`                    | B-tree UNIQUE    | Workspace URL routing |

---

## 4. MongoDB Collections Design

### `threads` collection (chat-service)

```json
{
  "_id": "ObjectId",
  "workspaceId": "uuid-string",
  "channelId": "uuid-string",
  "type": "direct | channel | ai",
  "participants": ["user-id-1", "user-id-2"],
  "lastMessage": { "content": "...", "senderId": "...", "at": "ISO8601" },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "metadata": {}
}
```

### `messages` collection (chat-service)

```json
{
  "_id": "ObjectId",
  "threadId": "ObjectId-ref",
  "senderId": "uuid-string",
  "senderType": "user | ai_agent",
  "content": "message text",
  "contentType": "text | markdown | code | tool_result",
  "attachments": [{ "type": "file", "url": "...", "name": "..." }],
  "reactions": [{ "emoji": "👍", "userIds": ["..."] }],
  "parentId": "ObjectId (for threads within threads)",
  "aiMetadata": {
    "agentId": "...",
    "model": "gpt-4o",
    "toolsUsed": ["doc.search"],
    "tokenCount": 512
  },
  "createdAt": "ISO8601",
  "editedAt": "ISO8601"
}
```

### `documents` collection (document-service)

```json
{
  "_id": "ObjectId",
  "workspaceId": "uuid-string",
  "uploadedBy": "uuid-string",
  "name": "Q4 Strategy.pdf",
  "mimeType": "application/pdf",
  "storageUrl": "s3://...",
  "sizeBytes": 2048000,
  "status": "pending | processing | indexed | failed",
  "tags": ["strategy", "2026"],
  "versions": [{ "version": 1, "url": "...", "at": "ISO8601" }],
  "aiMetadata": {
    "pageCount": 42,
    "wordCount": 15000,
    "language": "en",
    "vectorIndexed": true,
    "indexedAt": "ISO8601"
  },
  "createdAt": "ISO8601"
}
```

### Indexing Strategy (MongoDB)

| Collection  | Index          | Type     | Reason                     |
| ----------- | -------------- | -------- | -------------------------- |
| `threads`   | `workspaceId`  | Standard | Workspace thread listing   |
| `threads`   | `participants` | Multikey | Direct message lookup      |
| `messages`  | `threadId`     | Standard | Thread message listing     |
| `messages`  | `createdAt`    | Standard | Chronological sorting      |
| `documents` | `workspaceId`  | Standard | Workspace doc listing      |
| `documents` | `status`       | Standard | Processing queue filtering |

---

## 5. Redis Usage Patterns

### Key Namespaces

| Pattern                          | TTL                | Purpose                      |
| -------------------------------- | ------------------ | ---------------------------- |
| `session:{user_id}:{session_id}` | 7 days             | Refresh token state          |
| `blocklist:token:{jti}`          | Until token expiry | Revoked JWT tracking         |
| `ratelimit:{user_id}:{endpoint}` | 1 minute           | Sliding window rate limiting |
| `cache:user:{user_id}`           | 5 minutes          | User profile cache           |
| `cache:workspace:{workspace_id}` | 10 minutes         | Workspace settings cache     |
| `lock:doc:{document_id}`         | 30 seconds         | Distributed processing lock  |
| `queue:*`                        | N/A                | BullMQ job queues            |
| `pub:chat:{thread_id}`           | N/A                | Real-time message pub/sub    |

### Cache Invalidation

- Write-through: update cache on every write
- TTL-based expiry for read-heavy data
- Explicit invalidation via `DEL` on targeted mutations
- [TODO: evaluate cache warming strategy for cold start]

---

## 6. ChromaDB Vector Store

### Collections

| Collection            | Embedding Model        | Dimensions | Metadata Fields                                                     |
| --------------------- | ---------------------- | ---------- | ------------------------------------------------------------------- |
| `workspace_documents` | text-embedding-3-small | 1536       | `doc_id`, `workspace_id`, `chunk_index`, `source_url`, `indexed_at` |
| `agent_memory`        | text-embedding-3-small | 1536       | `user_id`, `session_id`, `memory_type`, `created_at`                |
| `knowledge_base`      | text-embedding-3-large | 3072       | `category`, `source`, `verified_at`                                 |

### Query Configuration

- Default `top_k`: 5 results
- Minimum similarity threshold: 0.7 (cosine similarity)
- Metadata filtering applied before vector search for workspace isolation
- [TODO: evaluate hybrid search with BM25 + vectors]

---

## 7. Data Ownership Rules

| Rule                       | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| Single owner               | Each data entity is owned by exactly one service                    |
| No cross-service DB access | Services never query another service's database directly            |
| API-mediated access        | Cross-service data access only through defined APIs                 |
| Workspace isolation        | All queries filter by `workspace_id` to enforce tenancy             |
| Soft deletes               | Entities use `deleted_at` instead of hard deletion for audit trails |

---

## 8. Migration Strategy

### PostgreSQL Migrations (Prisma)

```bash
# Development — create and apply migration
pnpm db:migrate:dev --name <migration-name>

# Production — apply pending migrations
pnpm db:migrate:deploy

# Seed development database
pnpm db:seed
```

- Migrations in `backend/packages/database/prisma/migrations/`
- Each migration is a timestamped SQL file generated by Prisma
- Zero-downtime migration patterns enforced:
  - Add columns as nullable first
  - Backfill data in a separate step
  - Add NOT NULL constraint after backfill
  - Never rename columns — add new, migrate, drop old

### MongoDB Schema Evolution

- MongoDB's flexible schema allows additive changes without migration
- Breaking schema changes handled via application-level versioning
- [TODO: evaluate Mongoose migrations for complex refactors]

---

## 9. Backup and Recovery

| Database   | Backup Strategy                  | Frequency  | Retention | RTO        | RPO        |
| ---------- | -------------------------------- | ---------- | --------- | ---------- | ---------- |
| PostgreSQL | Continuous WAL + daily snapshots | Daily      | 30 days   | 1 hour     | 5 minutes  |
| MongoDB    | Oplog-based continuous + daily   | Daily      | 30 days   | 1 hour     | 5 minutes  |
| Redis      | RDB snapshot + AOF               | 15 minutes | 7 days    | 15 minutes | 15 minutes |
| ChromaDB   | Periodic collection export       | Daily      | 14 days   | 4 hours    | 24 hours   |

### Restore Procedure

- [TODO: link to runbook/operations/database-restore.md]

---

## 10. Multi-Tenancy

### Isolation Strategy: Shared Database, Row-Level Isolation

- All tenant data in shared tables/collections
- `workspace_id` on every tenant-scoped entity
- Application-layer enforcement: all queries include workspace filter
- Prisma middleware enforces `workspace_id` on all writes/reads
- [TODO: evaluate row-level security (RLS) in PostgreSQL for defense in depth]

### Tenant Data Isolation Verification

- Automated tests verify no cross-workspace data leakage
- Penetration testing includes tenant isolation validation

---

## 11. Performance Patterns

| Pattern                     | Technology                   | Use Case                             |
| --------------------------- | ---------------------------- | ------------------------------------ |
| Query result caching        | Redis + TTL                  | Frequently read, rarely changed data |
| Database connection pooling | PgBouncer (future)           | PostgreSQL connection efficiency     |
| Read replicas               | PostgreSQL streaming replica | Offload read-heavy queries           |
| Cursor-based pagination     | All list endpoints           | Large result sets                    |
| Projection queries          | MongoDB `.project()`         | Return only needed fields            |
| Compound indexes            | PostgreSQL + MongoDB         | Multi-field filter queries           |
| Lazy loading                | Prisma `include`             | Avoid N+1 query patterns             |

---

## 12. Data Retention and GDPR

### Retention Policy

| Data Category     | Default Retention          | Configurable        |
| ----------------- | -------------------------- | ------------------- |
| Chat messages     | 90 days                    | Yes (per workspace) |
| Documents         | Until deleted              | —                   |
| Audit logs        | 1 year                     | No                  |
| Session tokens    | 7 days                     | No                  |
| Vector embeddings | Tied to document lifecycle | —                   |

### GDPR / Data Subject Rights

| Right                  | Implementation Status                |
| ---------------------- | ------------------------------------ |
| Right to access        | [TODO: user data export endpoint]    |
| Right to erasure       | [TODO: cascading delete pipeline]    |
| Right to portability   | [TODO: JSON export format]           |
| Right to rectification | [TODO: profile update + propagation] |

### PII Classification

| Field            | Classification        | Handling             |
| ---------------- | --------------------- | -------------------- |
| Email            | PII                   | Encrypted at rest    |
| IP address       | PII                   | Hashed after 30 days |
| Message content  | Potentially sensitive | Encrypted in transit |
| Document content | Potentially sensitive | Access-controlled    |

---

## 13. Architectural Tradeoffs

| Decision                 | Benefit                   | Cost                                |
| ------------------------ | ------------------------- | ----------------------------------- |
| Polyglot persistence     | Optimal fit per data type | Multiple systems to operate         |
| Shared PostgreSQL schema | Single migration surface  | Services share DB coupling          |
| MongoDB for chat         | Flexible message schema   | No ACID cross-doc transactions      |
| Redis for sessions       | Fast token validation     | Data loss risk without persistence  |
| ChromaDB over Pinecone   | Local dev, OSS, no cost   | Scale limits, less managed          |
| Soft deletes             | Audit trail, recovery     | Queries must filter deleted records |

---

## 14. Future Improvements

- [ ] Implement PostgreSQL Row Level Security (RLS) for defense-in-depth
- [ ] Add PgBouncer for PostgreSQL connection pooling
- [ ] Evaluate TimescaleDB for time-series analytics data
- [ ] Implement data archiving pipeline for aged chat data
- [ ] Add full-text search (PostgreSQL tsvector or Elasticsearch)
- [ ] GDPR erasure pipeline with cascading delete across all stores
- [ ] Evaluate Neon (serverless PostgreSQL) for development environments
- [ ] Add database query performance dashboard
