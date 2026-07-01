# Security Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Classification:** Internal — Sensitive | **Audience:** Security Engineers, All Engineers

---

## Purpose

This document defines the security architecture, threat model, controls, and operational security practices for Nexus AI Workspace. All engineers are expected to read the sections relevant to their domain before contributing to the codebase.

---

## Table of Contents

1. [Security Principles](#1-security-principles)
2. [Threat Model](#2-threat-model)
3. [Authentication Architecture](#3-authentication-architecture)
4. [Authorization (RBAC)](#4-authorization-rbac)
5. [API Security](#5-api-security)
6. [Data Security](#6-data-security)
7. [AI-Specific Security](#7-ai-specific-security)
8. [Infrastructure Security](#8-infrastructure-security)
9. [Secrets Management](#9-secrets-management)
10. [Dependency Security](#10-dependency-security)
11. [Security Testing](#11-security-testing)
12. [Incident Response](#12-incident-response)
13. [Compliance](#13-compliance)
14. [Security Checklist](#14-security-checklist)

---

## 1. Security Principles

| Principle             | Application                                               |
| --------------------- | --------------------------------------------------------- |
| **Zero Trust**        | No implicit trust inside or outside the network perimeter |
| **Least Privilege**   | Every component gets only the permissions it needs        |
| **Defense in Depth**  | Multiple independent layers of security controls          |
| **Fail Secure**       | On failure, deny access rather than grant it              |
| **Secure by Default** | Every feature ships with security controls enabled        |
| **Shift Left**        | Security concerns addressed during design and development |
| **Auditability**      | All security-relevant actions logged and traceable        |

---

## 2. Threat Model

### Assets to Protect

| Asset                       | Classification | Value                         |
| --------------------------- | -------------- | ----------------------------- |
| User credentials            | Critical       | Account takeover risk         |
| User messages and documents | Sensitive      | Privacy violation, IP leak    |
| AI model API keys           | Critical       | Cost fraud, data exfiltration |
| JWT signing secrets         | Critical       | Full authentication bypass    |
| Database connection strings | Critical       | Direct data access            |
| Workspace data              | Sensitive      | Multi-tenant data leak        |

### STRIDE Threat Analysis

| Threat                     | Attack Vector               | Control                                              |
| -------------------------- | --------------------------- | ---------------------------------------------------- |
| **Spoofing**               | Session token theft         | httpOnly cookies, short JWT expiry                   |
| **Tampering**              | Message replay attacks      | Request signing (future), HTTPS                      |
| **Repudiation**            | Deny sending a message      | Audit log with immutable records                     |
| **Information Disclosure** | Cross-workspace data leak   | workspace_id filtering, tenant isolation tests       |
| **Denial of Service**      | Brute force, flood requests | Rate limiting, CAPTCHAs, WAF                         |
| **Elevation of Privilege** | RBAC bypass                 | Server-side permission enforcement, claim validation |

### OWASP Top 10 Coverage

| OWASP Category                  | Status | Controls                                         |
| ------------------------------- | ------ | ------------------------------------------------ |
| A01 Broken Access Control       | [TODO] | RBAC middleware, workspace isolation             |
| A02 Cryptographic Failures      | [TODO] | HTTPS everywhere, bcrypt for passwords           |
| A03 Injection                   | [TODO] | Parameterized queries (Prisma), input validation |
| A04 Insecure Design             | [TODO] | Threat modeling, security ADRs                   |
| A05 Security Misconfiguration   | [TODO] | Helmet.js, security headers, no defaults         |
| A06 Vulnerable Components       | [TODO] | Dependabot, Snyk scanning                        |
| A07 Auth Failures               | [TODO] | JWT best practices, MFA (Phase 2)                |
| A08 Software Integrity Failures | [TODO] | Signed commits, SBOM                             |
| A09 Logging/Monitoring Failures | [TODO] | Audit logging, alert on anomalies                |
| A10 Server-Side Request Forgery | [TODO] | URL allowlist for external requests              |

---

## 3. Authentication Architecture

### Password Security

- Passwords hashed with **bcrypt** (cost factor: 12)
- Minimum password length: 12 characters
- Password strength requirements: uppercase, lowercase, number, special char
- Password reset via time-limited, single-use token (1-hour expiry)
- Breach detection: [TODO: integrate HaveIBeenPwned API]

### JWT Token Design

| Token         | Algorithm | Expiry     | Storage         | Revocation             |
| ------------- | --------- | ---------- | --------------- | ---------------------- |
| Access Token  | HS256     | 15 minutes | Memory (client) | JTI blocklist in Redis |
| Refresh Token | UUID      | 7 days     | httpOnly cookie | Stored hash in Redis   |

### Access Token Claims

```json
{
  "sub": "user-uuid",
  "jti": "unique-token-id",
  "iat": 1700000000,
  "exp": 1700000900,
  "workspaces": ["ws-uuid-1", "ws-uuid-2"],
  "role": "member",
  "permissions": ["chat.read", "chat.write", "doc.read"]
}
```

### Refresh Token Rotation

1. Client sends refresh token cookie to `/auth/refresh`
2. Server verifies token hash in Redis
3. Server atomically: delete old token, issue new access token + new refresh token
4. New refresh token set as httpOnly cookie
5. Old refresh token cannot be reused (rotation)

### Session Invalidation

- Logout: delete refresh token from Redis, add access JTI to blocklist
- Password change: invalidate all sessions for user
- Account suspension: user-level blocklist entry checked at every request

### Multi-Factor Authentication (MFA)

- [TODO: Phase 3] TOTP via authenticator app
- [TODO: Phase 3] SMS fallback (optional)
- [TODO: Phase 3] WebAuthn / passkeys

---

## 4. Authorization (RBAC)

### Role Hierarchy

```
super_admin
    └── org_admin
            └── workspace_admin
                    └── member
                            └── viewer
```

### Permission Model

Permissions are fine-grained flags checked at the service layer:

| Permission         | Description                           |
| ------------------ | ------------------------------------- |
| `chat.read`        | Read chat threads and messages        |
| `chat.write`       | Send messages                         |
| `chat.admin`       | Manage channels, delete any message   |
| `doc.read`         | Read documents                        |
| `doc.write`        | Upload and edit documents             |
| `doc.delete`       | Delete documents                      |
| `ai.use`           | Use AI chat and agent features        |
| `ai.admin`         | Configure AI settings for workspace   |
| `workspace.manage` | Manage workspace settings and members |
| `admin.access`     | Access admin dashboard                |

### Enforcement Layers

1. **API Gateway** — Validates JWT signature and expiry only
2. **Service Middleware** — Validates role claims and route-level permissions
3. **Service Business Logic** — Validates resource-level ownership
4. **Database** — Workspace-scoped queries (defense in depth)

---

## 5. API Security

### HTTP Security Headers (Helmet.js)

| Header                      | Value                               |
| --------------------------- | ----------------------------------- |
| `Content-Security-Policy`   | Restrictive CSP for XSS prevention  |
| `X-Frame-Options`           | DENY (clickjacking prevention)      |
| `X-Content-Type-Options`    | nosniff                             |
| `Strict-Transport-Security` | max-age=31536000; includeSubDomains |
| `Referrer-Policy`           | strict-origin-when-cross-origin     |
| `Permissions-Policy`        | Disable unnecessary browser APIs    |

### Rate Limiting

| Tier           | Limit | Window     | Scope          |
| -------------- | ----- | ---------- | -------------- |
| Login attempts | 5     | 15 minutes | Per IP         |
| General API    | 200   | 1 minute   | Per user       |
| AI inference   | 50    | 1 minute   | Per user       |
| File upload    | 10    | 1 minute   | Per user       |
| Admin API      | 100   | 1 minute   | Per admin user |

### Input Validation

- All request bodies validated with Zod schemas at API gateway + service level
- SQL injection prevented by Prisma parameterized queries
- MongoDB injection prevented by Mongoose schema validation
- File uploads: MIME type verification + virus scan ([TODO: integrate ClamAV])
- Maximum request body size: 100MB (configurable per endpoint)

### CORS Configuration

- Allowlist of approved origins (environment-configured)
- `credentials: true` only for allowlisted origins
- No wildcard `*` in production

---

## 6. Data Security

### Encryption at Rest

| Data Store        | Encryption       | Key Management         |
| ----------------- | ---------------- | ---------------------- |
| PostgreSQL        | AES-256 (disk)   | Cloud provider managed |
| MongoDB           | AES-256 (disk)   | Cloud provider managed |
| Redis             | AES-256 (disk)   | Cloud provider managed |
| File Storage (S3) | SSE-S3 / SSE-KMS | AWS KMS                |

### Encryption in Transit

- TLS 1.2 minimum (TLS 1.3 preferred) for all external traffic
- Internal service traffic: HTTPS in production ([TODO: mTLS via Istio])
- Database connections: TLS required in production

### Sensitive Field Handling

| Field                   | Handling                                                |
| ----------------------- | ------------------------------------------------------- |
| Passwords               | bcrypt hashed, never logged                             |
| Refresh tokens          | SHA-256 hashed before storage                           |
| API keys                | SHA-256 hashed, only first 8 chars shown in UI          |
| PII (email, name)       | Encrypted at application layer for sensitive workspaces |
| AI conversation content | Encrypted in MongoDB at field level ([TODO])            |

---

## 7. AI-Specific Security

### Prompt Injection Prevention

- Input sanitization: strip known injection patterns before LLM submission
- System prompt placed in separate, non-user-accessible context
- User input never directly concatenated into system prompt
- Output scanning: detect and redact injected instructions in responses

### AI Output Safety

- OpenAI Moderation API applied to all user inputs
- Output filtered for: harmful content, PII, executable code injection
- Agent tool calls reviewed: destructive operations require explicit confirmation
- AI cannot access data outside the user's permission scope

### LLM API Key Security

- API keys never exposed to clients
- Keys stored as environment secrets, injected at deployment
- Per-workspace API key isolation ([TODO: Phase 3])
- Usage monitoring with anomaly alerting

### Data Sent to External LLM Providers

- PII detection before external API calls
- Workspace data scrubbed of identifying information where possible
- Data processing agreements (DPA) required with all AI providers
- Zero-data-retention mode for sensitive workspaces ([TODO])

---

## 8. Infrastructure Security

### Network Security

- All services run in a private network; only API gateway is internet-facing
- Kubernetes NetworkPolicies deny all ingress/egress by default
- Explicit NetworkPolicy required for all allowed traffic paths
- WAF (Web Application Firewall) in front of API gateway ([TODO: configure])

### Container Security

- Base images from official, pinned, minimal sources (distroless where possible)
- Images scanned for vulnerabilities in CI pipeline (Trivy)
- No containers run as root
- Read-only root filesystem where possible
- Resource limits (CPU, memory) on all containers

### Kubernetes Security

- RBAC enabled and configured
- Pod Security Standards enforced (Restricted profile)
- Secrets stored in Kubernetes Secrets (encrypted at rest in etcd)
- Regular audit of cluster access
- [TODO: HashiCorp Vault integration for secret injection]

---

## 9. Secrets Management

### Secret Categories

| Category                | Examples                  | Storage                    |
| ----------------------- | ------------------------- | -------------------------- |
| Database credentials    | `DATABASE_URL`            | Kubernetes Secrets / Vault |
| API keys (external)     | `OPENAI_API_KEY`          | Kubernetes Secrets / Vault |
| JWT secrets             | `JWT_SECRET`              | Kubernetes Secrets / Vault |
| Internal service tokens | `INTERNAL_SERVICE_SECRET` | Kubernetes Secrets / Vault |

### Secret Lifecycle

- Secrets generated with cryptographic randomness (32+ bytes)
- Never committed to source control (`.gitignore` enforced, git-secrets scanner)
- Rotated quarterly or immediately on suspected compromise
- Access to production secrets limited to SRE team and CI/CD pipeline

### Secret Scanning

- `git-secrets` pre-commit hook prevents accidental commits
- GitHub secret scanning enabled on repository
- `truffleHog` or `gitleaks` scan in CI pipeline

---

## 10. Dependency Security

- `dependabot` or `Renovate` for automated dependency updates
- Snyk or `npm audit` / `pip-audit` in CI pipeline
- All dependencies pinned to exact versions in production
- `pnpm` lockfile committed and verified
- Node.js and Python version pinned in `.nvmrc` and `pyproject.toml`
- Regular review of transitive dependencies

---

## 11. Security Testing

| Test Type                     | Tool                                     | Frequency        |
| ----------------------------- | ---------------------------------------- | ---------------- |
| SAST (Static Analysis)        | ESLint security plugins, Bandit (Python) | Every PR         |
| Dependency vulnerability scan | `pnpm audit`, `pip-audit`, Snyk          | Every PR + daily |
| Container image scan          | Trivy                                    | Every build      |
| Secret scan                   | gitleaks                                 | Every commit     |
| DAST (Dynamic Analysis)       | OWASP ZAP                                | Monthly          |
| Penetration testing           | External vendor                          | Annually         |
| Tenant isolation testing      | Custom test suite                        | Every release    |
| Auth flow testing             | Jest integration tests                   | Every PR         |

---

## 12. Incident Response

### Severity Levels

| Level         | Description                             | Response Time | Escalation         |
| ------------- | --------------------------------------- | ------------- | ------------------ |
| P0 — Critical | Data breach, auth bypass                | 15 minutes    | All-hands          |
| P1 — High     | Service down, suspected breach          | 1 hour        | On-call + security |
| P2 — Medium   | Degraded security control               | 4 hours       | Security team      |
| P3 — Low      | Vulnerability discovered, not exploited | 48 hours      | Security team      |

### Response Playbook

1. Detect: Alert from monitoring, user report, or security scan
2. Triage: Assess severity, identify affected systems and data
3. Contain: Isolate affected systems, revoke compromised credentials
4. Communicate: Internal stakeholders, affected users (if required by law)
5. Eradicate: Remove threat, patch vulnerability
6. Recover: Restore service, verify security
7. Post-mortem: Root cause analysis, prevention measures

See [Incident Runbooks](./runbooks/incidents/) for detailed playbooks.

---

## 13. Compliance

| Regulation    | Applicability                  | Status                                 |
| ------------- | ------------------------------ | -------------------------------------- |
| GDPR          | EU user data                   | [TODO: implement data rights pipeline] |
| SOC 2 Type II | Enterprise customers           | [TODO: Phase 3 audit preparation]      |
| CCPA          | California users               | [TODO: privacy policy + opt-out]       |
| HIPAA         | Healthcare workspaces (future) | [Not in scope Phase 1-2]               |

---

## 14. Security Checklist

### Pre-Deployment Checklist

- [ ] All environment variables set (no defaults)
- [ ] TLS certificates valid and auto-renewing
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] All dependency vulnerabilities resolved (Critical/High)
- [ ] Container images scanned (no Critical CVEs)
- [ ] Secrets rotation confirmed
- [ ] Access logs flowing to SIEM
- [ ] Auth flows tested
- [ ] Tenant isolation tests passing

### Code Review Security Checklist

- [ ] No secrets in code
- [ ] Input validated at boundaries
- [ ] SQL/NoSQL queries parameterized
- [ ] Auth middleware applied to all routes
- [ ] Error responses do not leak internal details
- [ ] Logging does not include PII or credentials
- [ ] External service calls use allowlisted URLs
