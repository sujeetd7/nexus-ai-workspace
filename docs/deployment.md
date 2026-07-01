# Deployment Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** DevOps/SRE, Engineering Leaders

---

## Purpose

This document defines the deployment architecture, CI/CD pipeline, environment strategy, and operational procedures for Nexus AI Workspace. It covers containerization, Kubernetes configuration, environment promotion, rollback procedures, and monitoring integration.

---

## Table of Contents

1. [Environment Strategy](#1-environment-strategy)
2. [Containerization](#2-containerization)
3. [Docker Compose (Local Dev)](#3-docker-compose-local-dev)
4. [Kubernetes Architecture](#4-kubernetes-architecture)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Release Process](#6-release-process)
7. [Rollback Procedures](#7-rollback-procedures)
8. [Infrastructure as Code](#8-infrastructure-as-code)
9. [Secrets Management](#9-secrets-management)
10. [Observability Integration](#10-observability-integration)
11. [Scaling Strategy](#11-scaling-strategy)
12. [Disaster Recovery](#12-disaster-recovery)
13. [Architectural Tradeoffs](#13-architectural-tradeoffs)
14. [Future Improvements](#14-future-improvements)

---

## 1. Environment Strategy

### Environments

| Environment     | Purpose                   | Deploy Trigger                | Approvals   |
| --------------- | ------------------------- | ----------------------------- | ----------- |
| **local**       | Developer workstation     | Manual (`pnpm dev`)           | None        |
| **development** | Integration testing       | Push to `develop` branch      | None        |
| **staging**     | Pre-production validation | Merge to `main`               | Auto        |
| **production**  | Live system               | Manual promotion from staging | 2 approvals |

### Environment Configuration

| Config      | Local        | Development        | Staging         | Production       |
| ----------- | ------------ | ------------------ | --------------- | ---------------- |
| AI Provider | Mock / real  | Real (low tier)    | Real (standard) | Real (full)      |
| Log Level   | debug        | debug              | info            | warn             |
| Database    | Local Docker | Cloud dev instance | Cloud staging   | Cloud production |
| Redis       | Local Docker | Cloud dev          | Cloud staging   | Cloud production |
| TLS         | None         | Let's Encrypt      | Let's Encrypt   | ACM / Managed    |
| Rate Limits | Disabled     | Relaxed            | Production-like | Production       |

---

## 2. Containerization

### Base Image Strategy

| Service Type       | Base Image                     | Rationale                             |
| ------------------ | ------------------------------ | ------------------------------------- |
| Node.js services   | `node:22-alpine`               | Minimal, audited                      |
| Python AI services | `python:3.12-slim`             | Slim base, fewer vulnerabilities      |
| Build stages       | `node:22-alpine`               | Multi-stage to keep final image small |
| Production final   | `node:22-alpine` or distroless | Minimal attack surface                |

### Multi-Stage Dockerfile Pattern

```dockerfile
# Placeholder pattern — do not implement yet
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Stage 3: Production
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nexus -u 1001
COPY --from=builder --chown=nexus:nodejs /app/dist ./dist
USER nexus
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Container Registry

- Development: GitHub Container Registry (ghcr.io)
- Production: AWS ECR or GCP Artifact Registry
- Images tagged with: `{service}:{git-sha}-{env}`
- Immutable tags (never overwrite existing tag)

### Image Scanning

- Trivy scans every image in CI
- No Critical CVEs permitted in production images
- High CVEs require documented exception

---

## 3. Docker Compose (Local Dev)

### Services Defined (`docker-compose.yml`)

| Service                | Image                    | Port  | Dependencies                                   |
| ---------------------- | ------------------------ | ----- | ---------------------------------------------- |
| `api-gateway`          | Local build              | 4000  | auth, chat, doc, user, workspace, notification |
| `auth-service`         | Local build              | 4001  | postgres, redis                                |
| `chat-service`         | Local build              | 4002  | mongodb, redis                                 |
| `document-service`     | Local build              | 4003  | mongodb, redis                                 |
| `user-service`         | Local build              | 4004  | postgres                                       |
| `workspace-service`    | Local build              | 4005  | postgres                                       |
| `notification-service` | Local build              | 4006  | mongodb, redis                                 |
| `ai-platform`          | Local build              | 8000  | chromadb, redis, postgres                      |
| `mcp-registry`         | Local build              | 9000  | —                                              |
| `postgres`             | `postgres:16-alpine`     | 5432  | —                                              |
| `mongodb`              | `mongo:7`                | 27017 | —                                              |
| `redis`                | `redis:7-alpine`         | 6379  | —                                              |
| `chromadb`             | `chromadb/chroma:latest` | 8001  | —                                              |

### Local Development Commands

```bash
# Start all services
docker-compose up -d

# Start only infrastructure (DBs, Redis)
docker-compose up -d postgres mongodb redis chromadb

# View logs for a service
docker-compose logs -f api-gateway

# Rebuild and restart a service
docker-compose up -d --build auth-service

# Stop all services
docker-compose down

# Stop and remove volumes (full reset)
docker-compose down -v
```

---

## 4. Kubernetes Architecture

### Cluster Structure

```
nexus-ai-workspace/
├── infrastructure/
│   └── kubernetes/
│       ├── base/                   # Kustomize base manifests
│       │   ├── namespace.yaml
│       │   ├── services/           # Per-service Deployment + Service + HPA
│       │   ├── databases/          # StatefulSets for DBs (dev only)
│       │   └── configmaps/         # Non-sensitive config
│       ├── overlays/
│       │   ├── development/        # Dev-specific kustomize patches
│       │   ├── staging/            # Staging-specific patches
│       │   └── production/         # Production-specific patches
│       └── charts/                 # Helm charts (optional)
```

### Namespace Strategy

| Namespace       | Contents                                                   |
| --------------- | ---------------------------------------------------------- |
| `nexus-backend` | All backend microservices                                  |
| `nexus-ai`      | AI platform services                                       |
| `nexus-mcp`     | MCP servers and registry                                   |
| `nexus-infra`   | Monitoring, ingress, cert-manager                          |
| `nexus-data`    | Database StatefulSets (non-production: managed DB in prod) |

### Resource Definitions (Per Service)

Each service has:

- `Deployment` — Pod spec, image, environment, probes
- `Service` — ClusterIP for internal access
- `HorizontalPodAutoscaler` — CPU/memory-based scaling
- `PodDisruptionBudget` — Ensure availability during node maintenance
- `ServiceAccount` — Least-privilege pod identity

### Ingress

- NGINX Ingress Controller
- TLS termination via cert-manager + Let's Encrypt
- Route rules: `/api/*` → api-gateway, `/ws` → chat-service (WebSocket upgrade)

### Health Checks (All Services)

```yaml
# Placeholder — do not implement yet
livenessProbe:
  httpGet:
    path: /health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /ready
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 10
```

---

## 5. CI/CD Pipeline

### GitHub Actions Workflows

#### `ci.yml` — Pull Request Checks

```
Trigger: Pull Request to any branch

Jobs (parallel):
  ├── lint-and-typecheck
  │     Node.js services: ESLint + tsc
  │     Python services: Pylint + mypy
  │     Secrets scan: gitleaks
  │
  ├── test-backend
  │     Jest unit + integration tests
  │     Testcontainers for DB tests
  │
  ├── test-frontend
  │     Jest + React Testing Library
  │     Type check
  │
  ├── test-ai-platform
  │     pytest unit + integration
  │     AI quality benchmarks (on AI service changes)
  │
  └── build-images
        docker build (verify only, no push)
        Trivy image scan
```

#### `deploy-staging.yml` — Staging Deployment

```
Trigger: Push to `main` branch

Jobs (sequential):
  1. ci-checks (reuse PR checks)
  2. build-and-push
        Build all service images
        Tag: {service}:{sha}-staging
        Push to container registry
  3. deploy-staging
        kubectl apply kustomize overlays/staging
        Wait for rollout completion
  4. e2e-staging
        Run Playwright E2E tests against staging
  5. smoke-test
        HTTP health checks on all endpoints
```

#### `deploy-production.yml` — Production Deployment

```
Trigger: Manual workflow_dispatch with approved sha input

Jobs (sequential):
  1. validate-sha (confirm sha is staging-tested)
  2. production-approval (requires 2 approvals in GitHub)
  3. pre-deploy-backup (trigger DB backup)
  4. deploy-production
        kubectl apply kustomize overlays/production
        Canary deployment (20% → 50% → 100%)
        Wait for rollout at each stage
  5. post-deploy-verification
        Smoke tests
        Monitoring dashboards check
  6. notify (Slack notification to #deployments)
```

### Branch Strategy

| Branch       | Purpose             | Deploys To             |
| ------------ | ------------------- | ---------------------- |
| `feature/*`  | Feature development | — (PR checks only)     |
| `develop`    | Integration branch  | development            |
| `main`       | Release branch      | staging (automatic)    |
| `release/v*` | Release cut         | production (manual)    |
| `hotfix/*`   | Emergency fixes     | production (expedited) |

---

## 6. Release Process

### Standard Release

1. Feature PRs merged to `develop`
2. Sprint end: `develop` → `main` merge via PR
3. Staging deployment triggers automatically
4. QA validates staging (E2E tests + manual)
5. Release PR created with CHANGELOG
6. Production deployment triggered manually with approval
7. Canary rollout monitored (15 minutes per stage)
8. Full rollout or rollback decision

### Hotfix Release

1. Hotfix branch from `main`
2. Fix applied and reviewed (expedited review)
3. Merged to `main` + `develop`
4. Emergency staging skip (optional with VP approval)
5. Production deploy with rollback plan ready

### CHANGELOG Format (Conventional Commits)

```
## [1.2.0] - 2026-06-27

### Added
- feat(chat): AI streaming responses in chat threads
- feat(rag): Document chunking with semantic strategy

### Fixed
- fix(auth): Refresh token rotation race condition

### Security
- security(deps): Update openai package to 4.x
```

---

## 7. Rollback Procedures

### Kubernetes Rollback (Immediate)

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/{service-name} -n nexus-backend

# Rollback to specific revision
kubectl rollout undo deployment/{service-name} --to-revision=N -n nexus-backend

# Check rollout status
kubectl rollout status deployment/{service-name} -n nexus-backend
```

### Database Migration Rollback

- All Prisma migrations have a `down` migration
- Rollback procedure documented per migration in `migration.sql` comments
- Destructive migrations (column drops) deferred 2 versions for safety

### Decision Criteria for Rollback

| Signal                 | Threshold                     | Action                  |
| ---------------------- | ----------------------------- | ----------------------- |
| Error rate increase    | > 5% above baseline           | Immediate rollback      |
| P99 latency spike      | > 2x baseline sustained 5 min | Investigate → rollback  |
| AI quality degradation | > 10% drop in RAGAS score     | Rollback AI service     |
| Health check failures  | > 2 consecutive failures      | Kubernetes auto-restart |

---

## 8. Infrastructure as Code

### Terraform (`infrastructure/terraform/`)

```
terraform/
├── modules/
│   ├── vpc/                    # Network topology
│   ├── eks/                    # Kubernetes cluster (AWS EKS)
│   ├── rds/                    # PostgreSQL (AWS RDS)
│   ├── documentdb/             # MongoDB (AWS DocumentDB)
│   ├── elasticache/            # Redis (AWS ElastiCache)
│   └── s3/                     # File storage buckets
└── environments/
    ├── development/
    ├── staging/
    └── production/
```

### Terraform Workflow

```bash
# Plan changes
terraform plan -var-file=environments/staging/terraform.tfvars

# Apply (requires approval in CI)
terraform apply -var-file=environments/staging/terraform.tfvars

# Format check
terraform fmt -check -recursive
```

---

## 9. Secrets Management

### Local Development

- `.env` files (never committed, `.gitignore`d)
- `.env.example` committed with placeholder values

### Kubernetes Production

- Kubernetes Secrets for service credentials
- Secrets encrypted at rest in etcd
- [TODO: HashiCorp Vault for dynamic secrets and rotation]

### CI/CD Secrets

- GitHub Actions Secrets for deployment credentials
- Environment-scoped secrets (staging secrets cannot access production)
- Rotation documented in SRE runbooks

---

## 10. Observability Integration

### Metrics Stack

- **Prometheus**: Scrapes `/metrics` from all services
- **Grafana**: Dashboards per service + cross-service overview
- **Alertmanager**: Routes alerts to PagerDuty + Slack

### Key Dashboards

| Dashboard         | Key Signals                                           |
| ----------------- | ----------------------------------------------------- |
| Platform Overview | Request rate, error rate, P99 latency per service     |
| AI Platform       | Inference latency, token usage, RAG quality scores    |
| Chat Service      | WebSocket connections, message throughput, error rate |
| Database          | Query latency, connection pool, slow queries          |
| CI/CD             | Deployment frequency, change failure rate, MTTR       |

### Alert Runbooks

- All alerts link to relevant runbook
- Runbooks in `docs/runbooks/incidents/`
- Runbooks include: detection, triage, remediation, escalation

---

## 11. Scaling Strategy

### Horizontal Pod Autoscaling (HPA)

| Service      | Min Replicas | Max Replicas | Scale Metric                      |
| ------------ | ------------ | ------------ | --------------------------------- |
| api-gateway  | 2            | 20           | CPU > 70%                         |
| auth-service | 2            | 10           | CPU > 70%                         |
| chat-service | 2            | 15           | CPU > 70% + WebSocket connections |
| ai-platform  | 1            | 8            | CPU > 60% (GPU-intensive)         |
| mcp-registry | 2            | 5            | CPU > 70%                         |

### Database Scaling

| Database   | Strategy                       | Timeline |
| ---------- | ------------------------------ | -------- |
| PostgreSQL | Read replicas (RDS multi-AZ)   | Phase 2  |
| MongoDB    | Atlas auto-scaling             | Phase 2  |
| Redis      | Cluster mode                   | Phase 3  |
| ChromaDB   | Horizontal sharding evaluation | Phase 3  |

---

## 12. Disaster Recovery

| Scenario                   | RTO        | RPO        | Procedure                               |
| -------------------------- | ---------- | ---------- | --------------------------------------- |
| Single service failure     | 2 minutes  | 0          | Kubernetes auto-restart                 |
| Database failure (primary) | 30 minutes | 5 minutes  | RDS/Atlas failover to replica           |
| Region failure             | 4 hours    | 15 minutes | Cross-region failover ([TODO: Phase 4]) |
| Full cluster failure       | 2 hours    | 30 minutes | Restore from snapshots                  |
| Security breach            | 1 hour     | Depends    | Incident response playbook              |

### Recovery Testing

- Database restore drill: quarterly
- Full DR test: annually
- Failover test: semi-annually

---

## 13. Architectural Tradeoffs

| Decision                               | Benefit                              | Cost                           |
| -------------------------------------- | ------------------------------------ | ------------------------------ |
| Kubernetes over Docker Compose in prod | Scalability, resilience, ecosystem   | Operational complexity         |
| Kustomize over Helm                    | Simpler overlay model, no templating | Less reusable than Helm charts |
| Canary deployments                     | Safe rollout, easy rollback          | More complex pipeline          |
| Managed DB services in prod            | No DB ops burden                     | Higher cloud cost              |
| GitHub Actions over Jenkins            | Native to GitHub, managed            | Vendor lock-in                 |

---

## 14. Future Improvements

- [ ] Implement GitOps with ArgoCD for declarative deployment
- [ ] Add Istio service mesh for mTLS and advanced traffic management
- [ ] Multi-region active-active deployment
- [ ] Implement Chaos Engineering (LitmusChaos or Gremlin)
- [ ] Add SBOM (Software Bill of Materials) generation per release
- [ ] HashiCorp Vault for dynamic secret management
- [ ] Implement progressive delivery with Argo Rollouts
- [ ] Cost optimization with Kubernetes resource right-sizing
