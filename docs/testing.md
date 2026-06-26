# Testing Strategy

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** All Engineers

---

## Purpose

This document defines the comprehensive testing strategy for Nexus AI Workspace. It covers testing philosophies, tooling, coverage requirements, AI-specific evaluation patterns, and CI/CD integration for all layers of the platform.

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Pyramid](#2-test-pyramid)
3. [Frontend Testing](#3-frontend-testing)
4. [Backend Testing](#4-backend-testing)
5. [AI Platform Testing](#5-ai-platform-testing)
6. [MCP Testing](#6-mcp-testing)
7. [Infrastructure Testing](#7-infrastructure-testing)
8. [Test Data Management](#8-test-data-management)
9. [CI/CD Integration](#9-cicd-integration)
10. [Coverage Requirements](#10-coverage-requirements)
11. [Performance Testing](#11-performance-testing)
12. [Security Testing](#12-security-testing)
13. [Future Improvements](#13-future-improvements)

---

## 1. Testing Philosophy

| Principle | Application |
|---|---|
| **Test behavior, not implementation** | Write tests that survive refactoring |
| **Fast feedback loops** | Unit tests run in < 30 seconds |
| **Isolation** | Tests do not depend on each other or on external services |
| **Determinism** | Tests produce the same result on every run |
| **Meaningful failures** | A failing test clearly explains what broke and why |
| **AI evaluation is first class** | AI feature quality is measured, not assumed |
| **Test in production patterns** | Feature flags + canary deployments complement tests |

---

## 2. Test Pyramid

```
                    ▲
                   /|\
                  / | \
                 /  |  \
                / E2E\  \          Playwright / Detox
               /    |    \         (Critical user paths only)
              /─────┼──────\
             /  Integration \      Jest + Supertest + MSW
            /       |        \     (Service flows, API contracts)
           /─────────┼─────────\
          /       Unit Tests     \  Jest / pytest / RTL
         /           |            \ (80%+ of all tests)
        ▼────────────┴─────────────▼
```

### Layer Distribution Target

| Layer | % of Tests | Run Time Target |
|---|---|---|
| Unit | 70% | < 2 minutes |
| Integration | 25% | < 10 minutes |
| E2E | 5% | < 20 minutes |

---

## 3. Frontend Testing

### Technology Stack

| Tool | Purpose |
|---|---|
| **Jest** | Test runner and assertion library |
| **React Testing Library** | Component behavioral testing |
| **MSW (Mock Service Worker)** | HTTP request mocking |
| **Playwright** | End-to-end browser testing |
| **Storybook** | Component isolation and visual testing |
| **Chromatic** | Visual regression testing |
| **Axe-core** | Accessibility testing |
| **Detox** | React Native E2E testing |

### Unit Testing

#### Component Tests

- Test from the user's perspective (what they see and do)
- Do not test implementation details (component state, CSS classes)
- Cover all user-visible states: loading, success, error, empty

```typescript
// Placeholder test pattern
describe('MessageBubble', () => {
  it('renders user message with correct content', () => { /* ... */ });
  it('renders AI message with streaming indicator', () => { /* ... */ });
  it('renders error state when send fails', () => { /* ... */ });
  it('is accessible (no ARIA violations)', () => { /* ... */ });
});
```

#### Hook Tests

- Hooks tested in isolation using `renderHook`
- RTK Query hooks tested with MSW API mocking

#### Redux Slice Tests

- Reducer purity: same input always produces same output
- Selector tests for derived state

### Integration Testing

- Full feature flows with MSW mocking the backend
- Auth flow: login → protected route access → token refresh → logout
- Chat flow: send message → receive AI stream → message persists
- Document flow: upload → indexing status → RAG query

### E2E Testing (Playwright)

Covers critical user paths only:

| Test | Path |
|---|---|
| Auth E2E | Register → Verify email → Login → Dashboard |
| Chat E2E | Create thread → Send message → Receive AI response |
| Document E2E | Upload document → Query document with AI |
| Workspace E2E | Create workspace → Invite member → Member accepts |

### Accessibility Testing

- Every component in the UI Kit runs `axe-core` assertions
- No critical or serious ARIA violations permitted to ship

---

## 4. Backend Testing

### Technology Stack

| Tool | Purpose |
|---|---|
| **Jest** | Test runner (Node.js) |
| **Supertest** | HTTP integration testing |
| **Testcontainers** | Real database containers for integration tests |
| **nock** | HTTP request mocking |
| **faker.js** | Test data generation |
| **Pact** | Consumer-driven contract testing (future) |

### Unit Testing

#### Service Layer Tests

- All business logic functions unit tested in isolation
- External dependencies (DB, Redis, external APIs) mocked with `jest.mock()`

#### Middleware Tests

- Auth middleware: valid token, expired token, revoked token, missing token
- Rate limiter: under limit, at limit, over limit
- Validation middleware: valid body, invalid body, missing required fields

### Integration Testing (Per Service)

#### Auth Service Integration

```
POST /auth/register → verify user created in DB
POST /auth/login → verify JWT returned, refresh token set
POST /auth/refresh → verify token rotated
POST /auth/logout → verify refresh token revoked
```

#### Chat Service Integration

```
POST /chat/threads → verify thread created in MongoDB
POST /chat/threads/:id/messages → verify message persisted, event published
WebSocket connection → verify typing events delivered
```

### Contract Testing (Future)

- Pact for consumer-driven contract tests between services
- Each service has a consumer contract for its dependencies
- Prevents breaking changes in APIs

### Database Testing

- Integration tests run against real databases via Testcontainers
- Each test suite creates isolated schema/collection
- Teardown after each test run

---

## 5. AI Platform Testing

AI testing is unique: **correctness is probabilistic**. The strategy combines deterministic unit tests with statistical quality benchmarks.

### Technology Stack

| Tool | Purpose |
|---|---|
| **pytest** | Test runner (Python) |
| **pytest-asyncio** | Async test support |
| **RAGAS** | RAG pipeline quality evaluation |
| **LangSmith** | LLM trace evaluation |
| **httpx** | HTTP client for FastAPI integration tests |
| **respx** | HTTP mocking for provider calls |

### Unit Testing (Python)

#### Chain Tests

- Each LangChain chain tested with mocked LLM responses
- Prompt template rendering verified
- Input/output schema validation

#### Agent State Machine Tests

- LangGraph node functions tested in isolation
- State transition correctness verified
- Error handling paths covered

#### Provider Adapter Tests

- Each provider adapter tested with mocked HTTP responses
- Failover logic verified (primary fails → secondary invoked)
- Token counting utilities unit tested

### Integration Testing

#### RAG Pipeline Integration

```
Ingest document → verify ChromaDB contains correct chunks
Query → verify retrieved chunks match expected sources
Full RAG chain → verify response includes citations
```

#### Agent Service Integration

```
Invoke ChatAgent → verify streaming response
Invoke DocumentAgent → verify RAG tool called
Tool errors → verify graceful recovery response
```

### AI Quality Evaluation (Golden Dataset)

The `ai/tests/benchmarks/` directory contains a golden dataset for AI quality evaluation:

#### RAG Evaluation (RAGAS)

| Metric | Definition | Minimum Threshold |
|---|---|---|
| Faithfulness | Is the answer grounded in context? | 0.85 |
| Answer Relevancy | Is the answer relevant to the question? | 0.80 |
| Context Precision | Are retrieved chunks relevant? | 0.75 |
| Context Recall | Are all relevant chunks retrieved? | 0.70 |

#### Agent Evaluation (Custom)

| Metric | Definition | Minimum Threshold |
|---|---|---|
| Task Success Rate | Agent completes task correctly | 0.90 |
| Tool Selection Accuracy | Correct tool selected for task | 0.85 |
| Instruction Following | Agent follows user instructions | 0.90 |
| Hallucination Rate | Fabricated information detected | < 0.05 |

### LLM-as-Judge Evaluation

- Complex generation quality assessed by a second LLM (GPT-4o)
- Rubric-based scoring (1-5 scale) for: helpfulness, accuracy, tone
- Regression testing: new model/prompt must not decrease score vs. baseline

---

## 6. MCP Testing

### MCP Server Unit Tests

- Each tool function tested with mocked dependencies
- Input schema validation tested for valid and invalid inputs
- Error responses verified for each tool error code

### MCP Registry Tests

- Server registration and deregistration
- Health check routing
- Tool discovery endpoint response format
- Routing to correct server for each tool call

### MCP Integration Tests

- Full tool invocation via registry → server → response
- Authentication enforcement tested (valid key, invalid key, expired key)
- Rate limiting per tool

---

## 7. Infrastructure Testing

### Docker Compose Tests

- `docker-compose up` smoke test in CI
- Health checks verified for each service

### Kubernetes Manifest Tests

- `kubeval` for manifest schema validation
- `kube-score` for best practice linting
- Smoke tests post-deployment to staging

### Terraform Tests

- `terraform validate` in CI
- `terraform plan` with no-op changes for regression
- [TODO: terratest for integration testing]

---

## 8. Test Data Management

### Fixtures (`ai/tests/fixtures/`, `shared/tests/`)

- Realistic but synthetic test data (no real user data)
- Fixtures versioned alongside code
- Factory functions for dynamic test data generation

### Test Isolation

- Each test creates its own data and cleans up after itself
- No shared mutable state between test cases
- Testcontainers creates fresh databases per test suite

### Seeding

- Development seed data in `infrastructure/scripts/seed/`
- Separate AI evaluation dataset in `ai/tests/fixtures/`

---

## 9. CI/CD Integration

### PR Gate (Required to Merge)

```
1. Lint (ESLint + Prettier + Pylint)
2. Type check (tsc --noEmit + mypy)
3. Unit tests (Jest + pytest)
4. Integration tests (Jest + pytest)
5. Security scan (gitleaks + pnpm audit + pip-audit)
6. Container build (verify image builds)
```

### Staging Deployment Gate

```
1. All PR gates passed
2. E2E tests on staging environment
3. AI quality benchmarks (RAGAS thresholds met)
4. Smoke tests post-deployment
5. Manual QA sign-off (for major releases)
```

### Test Execution Strategy

- Unit tests: run on every commit
- Integration tests: run on every PR
- E2E tests: run on staging deployment
- AI quality evaluation: run on AI service changes

---

## 10. Coverage Requirements

| Layer | Minimum Coverage | Tool |
|---|---|---|
| Frontend — components | 80% | Jest --coverage |
| Frontend — Redux slices | 90% | Jest --coverage |
| Backend — service layer | 80% | Jest --coverage |
| Backend — middleware | 90% | Jest --coverage |
| AI — chains + nodes | 75% | pytest-cov |
| AI — provider adapters | 90% | pytest-cov |
| MCP servers | 80% | Jest / pytest-cov |

Coverage is a minimum bar, not a target — prefer meaningful tests over coverage padding.

---

## 11. Performance Testing

### Tools

| Tool | Use Case |
|---|---|
| k6 | Load testing API gateway and services |
| Artillery | WebSocket load testing (chat service) |
| Locust | AI platform load testing (Python-native) |
| Lighthouse | Frontend Core Web Vitals |

### Scenarios

| Scenario | Virtual Users | Duration | Target |
|---|---|---|---|
| API gateway baseline | 100 VUs | 5 min | P99 < 200ms |
| Chat message send | 500 VUs | 10 min | P99 < 500ms |
| Concurrent AI chat | 50 VUs | 5 min | TTFB P90 < 1000ms |
| Document upload | 20 VUs | 5 min | < 30s for 10MB file |
| WebSocket connections | 1000 VUs | 5 min | No drops, P99 < 100ms |

### Benchmark Baselines

- Baselines established in Phase 1 and tracked per release
- 20% regression triggers investigation before release

---

## 12. Security Testing

See [Security Architecture](./security.md) for full details.

| Test | Tool | Frequency |
|---|---|---|
| SAST | ESLint security + Bandit | Every PR |
| Dependency scan | pnpm audit + pip-audit | Every PR |
| Container scan | Trivy | Every build |
| Secret scan | gitleaks | Every commit |
| DAST | OWASP ZAP | Monthly |
| Pen test | External vendor | Annually |

---

## 13. Future Improvements

- [ ] Implement Pact for consumer-driven contract testing
- [ ] Add visual regression testing with Chromatic
- [ ] Build AI agent simulation harness for reproducible agent testing
- [ ] Add chaos engineering tests (kill random services, verify graceful degradation)
- [ ] Implement mutation testing to validate test quality
- [ ] Build automated performance regression dashboard
- [ ] Add property-based testing (fast-check) for complex business logic
