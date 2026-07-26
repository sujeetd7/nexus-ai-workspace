# ADR-0003: Microfrontend Architecture

> **ID:** ADR-0003
> **Title:** Microfrontend Architecture
> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Principal Staff Engineer, Frontend Lead, Platform Lead
> **Supersedes:** N/A
> **Superseded By:** N/A

---

## Context

The Nexus AI Workspace web application spans multiple distinct feature domains: AI chat, document editing, workspace management, admin dashboard, and AI copilot sidebar. Each domain may be owned by a different team, has different release cadences, and carries distinct technical requirements.

We must decide whether to build a single unified React application (SPA monolith), a federated microfrontend system, or something in between.

### Forces at Play

- Multiple frontend feature teams will develop in parallel
- Different features have different release cadences (chat ships weekly; admin ships monthly)
- Some features are optional (e.g., admin panel) and should not bloat every user's bundle
- Core shared dependencies (React, Redux, Router) should not be duplicated across MFEs
- Local development must remain fast — engineers should not run the full platform to work on one feature
- The mobile app (React Native) is a separate application requiring maximum code reuse with web

### Technical Constraints

- Webpack 5 and Vite both support Module Federation
- The monorepo (ADR-001) allows shared packages regardless of MFE strategy
- Each MFE must not create a noticeable loading delay for users (performance constraint)

---

## Decision

We adopt a **microfrontend architecture** using **Module Federation** (Vite Plugin Federation) with a **shell application** that hosts independently developed and deployable MFE packages.

### Shell Application

The shell application (`frontend/apps/web/`) is responsible for:

- Application layout and navigation chrome
- Routing (React Router v6 top-level routes)
- Global shared dependencies (React, Redux, Router) — provided to all MFEs
- Authentication state initialization
- Theme and locale providers
- Dynamic import and rendering of MFE remote modules

### Microfrontend Decomposition

| MFE             | Route Prefix    | Team           | Key Features                     |
| --------------- | --------------- | -------------- | -------------------------------- |
| `shell` (host)  | `/` (global)    | Platform       | Layout, nav, auth                |
| `chat-mfe`      | `/chat/*`       | Chat Team      | Threads, messages, AI chat       |
| `document-mfe`  | `/docs/*`       | Docs Team      | Document list, editor, AI tools  |
| `workspace-mfe` | `/workspace/*`  | Workspace Team | Teams, settings, integrations    |
| `copilot-mfe`   | Sidebar overlay | AI Team        | AI assistant, suggestions        |
| `admin-mfe`     | `/admin/*`      | Platform Team  | Admin dashboard, user management |

### Composition Mechanism

- **Module Federation** (Vite Plugin Federation): Each MFE exposes a root React component as a remote module
- Shell dynamically imports MFE modules at runtime using `React.lazy` + `Suspense`
- Shared singleton libraries: React, React-DOM, Redux, React Router — provided by shell, consumed by MFEs
- Each MFE has its own build pipeline (Turborepo task), deployable independently

### Cross-MFE State Sharing

| Method                           | Use Case                                           |
| -------------------------------- | -------------------------------------------------- |
| Redux global store (shell-owned) | Auth state, active workspace, user profile         |
| Custom DOM events                | Cross-MFE notifications (e.g., `notification:new`) |
| URL / React Router               | Navigation state                                   |
| Shell context providers          | Theme, locale                                      |

### Shared Package Strategy (`frontend/packages/`)

All truly shared code lives in versioned packages, not in MFEs:

| Package                | Shared Content                             |
| ---------------------- | ------------------------------------------ |
| `@nexus/ui-kit`        | All UI components, Tailwind design tokens  |
| `@nexus/auth-sdk`      | Auth hooks, token management, route guards |
| `@nexus/socket-client` | Typed Socket.io client                     |
| `@nexus/analytics`     | Event tracking abstraction                 |

---

## Considered Alternatives

### Alternative 1: SPA Monolith (Single React Application)

**Description:** A single React application (`frontend/apps/web/`) containing all feature code, built and deployed as one unit.

**Pros:**

- Simplest development model
- Shared state is trivial (same process)
- No Module Federation configuration complexity
- Fastest initial development velocity

**Cons:**

- Single deployment unit: any change triggers full redeployment
- Bundle size grows unbounded as features are added
- Teams block each other: broken code in one domain can prevent unrelated features from shipping
- Hard to do independent A/B testing of features

**Reason rejected:** The platform's multi-team structure and the distinct release cadences of chat vs. admin vs. documents make the SPA monolith's single deployment unit a scaling problem for teams, not just technology.

### Alternative 2: Separate Applications per Domain (No Federation)

**Description:** Each feature domain is a fully separate React application, served from different URLs or subdomains. Navigation between apps requires full page loads.

**Pros:**

- Maximum isolation — truly independent
- No federation complexity

**Cons:**

- Full page reload between features destroys user experience
- No shared state without external store (e.g., shared Redis session)
- Shared UI component behavior is inconsistent without strict version discipline
- Loses the "single workspace" product experience

**Reason rejected:** The product requires a unified, seamless workspace experience. Full-page reloads between features are incompatible with a real-time AI workspace product.

### Alternative 3: Module Federation (Chosen)

**Description:** Shell application + dynamically loaded MFE modules via Module Federation.

**Pros:**

- Independent deployment per MFE
- Single-page navigation experience (no page reloads)
- Shared singleton dependencies (React, Redux) prevent duplication
- Feature-level code splitting: only load what the user needs
- Team ownership boundaries enforced by build boundaries

**Cons:**

- More complex build configuration (Module Federation setup)
- Runtime composition means errors in one MFE can affect the shell if not properly isolated
- Debugging across MFE boundaries is harder
- Shared dependency versioning requires coordination (must agree on React version)

**Reason chosen:** Provides the team independence of separate applications while preserving the seamless single-page experience of a monolith. Module Federation's shared dependencies prevent bundle bloat.

### Alternative 4: Iframes

**Description:** Each feature loaded in an iframe within a shell.

**Reason rejected:** Iframes have severe UX limitations (accessibility, scroll behavior, resize complexity, deep linking), and sharing state between iframe and host requires postMessage, which is error-prone and untyped. Not appropriate for a modern AI workspace product.

---

## Consequences

### Positive

- Feature teams can deploy their MFE on their own release cycle
- Each MFE can have its own performance budget and optimization
- The shell loads fast; feature bundles load on-demand
- Feature flags can enable/disable entire MFEs without code changes

### Negative

- **Build complexity** — Module Federation configuration must be maintained per MFE
- **Shared dependency discipline** — All MFEs must use the same major version of React and Redux
- **Runtime errors** — A broken MFE module import degrades the shell; error boundaries are mandatory
- **Development experience** — Engineers must run more than one Vite dev server for cross-MFE work

### Mitigations

- Each MFE has an independent fallback UI (error boundary + `Suspense` fallback)
- Turborepo orchestrates all MFE dev servers in a single `pnpm dev` command
- Shared dependency versions pinned in `pnpm-workspace.yaml` with enforced compatibility

### Risks

| Risk                                          | Likelihood | Mitigation                           |
| --------------------------------------------- | ---------- | ------------------------------------ |
| Module Federation bundle version mismatch     | Medium     | Pinned shared deps, CI version check |
| Performance regression from large MFE bundles | Low        | Bundle size budgets in CI            |
| Cross-MFE state desync                        | Low        | Strict Redux slice ownership rules   |

---

## Implementation Notes

- MFE remote entries served from a CDN in production for optimal loading
- Each MFE exposes a single `bootstrap` entry point to the shell
- Error boundaries wrap every dynamic MFE import
- Phase 1 ships as a SPA monolith (faster to build); MFE extraction happens in Phase 2 once team boundaries stabilize

---

## Related Decisions

- [ADR-001: Monorepo with Turborepo](./ADR-001-monorepo-turborepo.md)
- [ADR-0001: Project Vision](./0001-project-vision.md)
- [Frontend Architecture](../frontend.md)
