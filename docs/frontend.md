# Frontend Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** Frontend Engineers

---

## Purpose

This document defines the frontend architecture for Nexus AI Workspace. It covers the microfrontend decomposition strategy, technology decisions, state management patterns, real-time communication, and design system conventions. Both the React web application and React Native mobile application are addressed.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Microfrontend Strategy](#2-microfrontend-strategy)
3. [Application Structure](#3-application-structure)
4. [State Management](#4-state-management)
5. [API Integration](#5-api-integration)
6. [Real-Time Communication](#6-real-time-communication)
7. [Forms and Validation](#7-forms-and-validation)
8. [Design System & UI Kit](#8-design-system--ui-kit)
9. [Authentication Flow](#9-authentication-flow)
10. [Mobile Architecture](#10-mobile-architecture)
11. [Performance Strategy](#11-performance-strategy)
12. [Testing Strategy](#12-testing-strategy)
13. [Future Improvements](#13-future-improvements)

---

## 1. Architecture Overview

The frontend is organized as a **microfrontend monorepo** under `frontend/`. Independent feature shells compose into a unified shell application, enabling independent deployment and team ownership.

```
frontend/
├── apps/
│   ├── web/                    # Shell application (React 18 / Vite)
│   └── mobile/                 # Mobile app (React Native / Expo)
├── packages/
│   ├── ui-kit/                 # Shared Tailwind + Radix component library
│   ├── auth-sdk/               # Auth hooks, token management, guards
│   ├── socket-client/          # Typed Socket.io client wrapper
│   └── analytics/              # Event tracking, user session analytics
└── config/
    ├── typescript/             # Shared tsconfig base
    ├── eslint/                 # Shared ESLint config
    └── tailwind/               # Shared Tailwind config
```

---

## 2. Microfrontend Strategy

### Decomposition

| Microfrontend | Owner | Routes | Description |
|---|---|---|---|
| `shell` | Platform Team | `/` | App shell, navigation, layout |
| `chat-mfe` | Chat Team | `/chat/*` | Chat workspace, threads, AI chat |
| `document-mfe` | Docs Team | `/docs/*` | Document editor, AI document tools |
| `workspace-mfe` | Workspace Team | `/workspace/*` | Team spaces, settings, integrations |
| `copilot-mfe` | AI Team | `/copilot/*` | AI assistant sidebar, suggestions |
| `admin-mfe` | Platform Team | `/admin/*` | Admin dashboard, user management |

### Composition Pattern

- **Module Federation** (Webpack 5 / Vite Plugin Federation) for runtime composition
- Shell app hosts shared dependencies: React, Redux, Router
- Each MFE exposes a root component that the shell dynamically imports
- Fallback loading UI displayed while MFE bundle loads

### Communication

| Pattern | Use Case | Implementation |
|---|---|---|
| Redux global store | Shared auth state, user preferences | RTK slices with strict slice ownership |
| Custom events | Cross-MFE notifications | DOM `CustomEvent` with typed payloads |
| URL params | Navigation state | React Router v6 |
| Shared context | Theme, locale | React Context (shell-provided) |

### Tradeoffs

| Benefit | Cost |
|---|---|
| Independent deployability per MFE | Increased bundle configuration complexity |
| Team ownership boundaries | Shared state synchronization overhead |
| Incremental technology migration | Runtime composition debugging difficulty |

---

## 3. Application Structure

### Web App (`apps/web/`)

```
web/
├── src/
│   ├── app/                    # App root, providers, router
│   ├── features/               # Feature-scoped modules
│   │   ├── auth/               # Login, register, password reset
│   │   ├── chat/               # Chat threads, message list, input
│   │   ├── documents/          # Document list, editor, AI tools
│   │   ├── workspace/          # Team management, settings
│   │   └── copilot/            # AI sidebar, suggestions panel
│   ├── shared/
│   │   ├── components/         # Generic layout, feedback components
│   │   ├── hooks/              # useDebounce, useIntersection, etc.
│   │   ├── utils/              # Date formatting, string helpers
│   │   └── constants/          # API endpoints, config constants
│   ├── store/                  # Redux store, root reducer
│   ├── types/                  # Global TypeScript types
│   └── main.tsx                # Entry point
├── public/                     # Static assets
├── index.html
├── vite.config.ts
└── tsconfig.json
```

### Feature Module Structure (per feature)

```
features/chat/
├── api/                        # RTK Query API slice
├── components/                 # Feature-specific React components
│   ├── ChatList/
│   ├── MessageBubble/
│   └── ChatInput/
├── hooks/                      # Feature-specific hooks
├── slices/                     # Redux Toolkit slice
├── types/                      # Feature-local types
└── index.ts                    # Public barrel export
```

---

## 4. State Management

### Technology: Redux Toolkit + RTK Query

| State Category | Location | Technology |
|---|---|---|
| Server state (fetched data) | RTK Query cache | RTK Query |
| UI state (modals, panels) | Feature slice | Redux Toolkit |
| Auth state | Auth slice | Redux Toolkit |
| Form state | Component-local | React Hook Form |
| Real-time state | Socket slice | Redux Toolkit + Socket.io |

### Redux Store Structure

```typescript
// Placeholder — store shape
{
  auth: AuthState,             // JWT, user profile, permissions
  ui: UIState,                 // Theme, sidebar, active modals
  chat: ChatState,             // Active thread, message drafts
  workspace: WorkspaceState,   // Active workspace, members
  copilot: CopilotState,       // AI assistant context, suggestions
  api: RTKQueryCacheState      // Normalized server data cache
}
```

### RTK Query API Slices

| Slice | Base URL | Key Endpoints |
|---|---|---|
| `authApi` | `/api/auth` | login, logout, refresh, register |
| `chatApi` | `/api/chat` | threads, messages, send |
| `documentApi` | `/api/documents` | list, upload, get, delete |
| `workspaceApi` | `/api/workspace` | list, create, members |
| `userApi` | `/api/users` | profile, preferences, search |
| `copilotApi` | `/api/ai` | complete, stream, feedback |

### Guidelines

- Server state belongs in RTK Query — do not duplicate in Redux slices
- Optimistic updates via `onQueryStarted` lifecycle
- Mutations invalidate relevant cache tags on success
- Real-time updates patch the RTK Query cache via `dispatch(api.util.updateQueryData(...))`

---

## 5. API Integration

### HTTP Transport

- All API calls through RTK Query `fetchBaseQuery`
- Base URL from environment variable `VITE_API_BASE_URL`
- JWT access token injected in `prepareHeaders`
- 401 response triggers automatic token refresh via `baseQueryWithReauth` wrapper

### Streaming Responses (AI)

- AI chat responses consumed via `EventSource` (SSE)
- Streaming state managed in Redux slice
- Partial tokens appended to message buffer in real-time
- Error boundary handles stream interruption

### Error Handling

| Error Type | Handling Strategy |
|---|---|
| 400 Bad Request | Form-level validation error display |
| 401 Unauthorized | Auto refresh → retry → redirect to login |
| 403 Forbidden | Toast notification, log to analytics |
| 429 Rate Limited | Exponential backoff with user notification |
| 500 Server Error | Global error boundary, retry option |
| Network Error | Offline banner, queue failed requests |

---

## 6. Real-Time Communication

### Socket.io Client (`packages/socket-client/`)

- Singleton socket instance initialized on authentication
- Typed event emitters and listeners using shared contract types from `shared/contracts/socket-contracts.ts`
- Automatic reconnection with exponential backoff
- Namespace strategy: `/chat`, `/notifications`, `/copilot`

### Event Taxonomy

| Namespace | Event | Direction | Payload |
|---|---|---|---|
| `/chat` | `message:send` | Client → Server | `MessagePayload` |
| `/chat` | `message:receive` | Server → Client | `MessagePayload` |
| `/chat` | `typing:start` | Client → Server | `TypingPayload` |
| `/chat` | `typing:stop` | Client → Server | `TypingPayload` |
| `/copilot` | `stream:token` | Server → Client | `TokenPayload` |
| `/copilot` | `stream:end` | Server → Client | `StreamEndPayload` |
| `/notifications` | `notify:push` | Server → Client | `NotificationPayload` |

---

## 7. Forms and Validation

### Technology: React Hook Form + Zod

- All forms controlled by React Hook Form for performance
- Zod schemas define validation rules; `zodResolver` bridges to RHF
- Shared Zod schemas imported from `shared/schemas/zod/`
- Form error messages from i18n string table (future)

### Form Conventions

```typescript
// Placeholder pattern — do not implement yet
const schema = z.object({ /* from shared/schemas/zod */ });
type FormValues = z.infer<typeof schema>;

const { register, handleSubmit, formState } = useForm<FormValues>({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ },
});
```

---

## 8. Design System & UI Kit

### Package: `packages/ui-kit/`

Built on top of **Radix UI primitives** + **Tailwind CSS** + **class-variance-authority (CVA)**.

| Component Category | Examples |
|---|---|
| Primitives | Button, Input, Badge, Avatar, Tooltip |
| Layout | Container, Grid, Stack, Divider |
| Feedback | Toast, Alert, Skeleton, Spinner |
| Overlay | Modal, Sheet, Popover, ContextMenu |
| Navigation | Tabs, Sidebar, Breadcrumb, Pagination |
| AI-specific | MessageBubble, StreamingText, CopilotPanel |
| Data Display | DataTable, Card, Stat, Timeline |

### Design Tokens (Tailwind)

- Colors: semantic tokens (primary, secondary, destructive, muted)
- Typography: Inter font, responsive scale
- Spacing: 4px base unit grid
- Dark mode: `class` strategy via `dark:` prefixes
- [TODO: link to Figma design system]

---

## 9. Authentication Flow

### Client-Side

1. `AuthProvider` initializes from persisted access token in memory (not localStorage)
2. Refresh token stored in `httpOnly` cookie (server-managed)
3. `useAuth()` hook exposes `{ user, isAuthenticated, login, logout }`
4. Route guards via `<RequireAuth>` wrapper components
5. RBAC-based component rendering via `<RequireRole role="admin" />`

### Token Lifecycle

```
App Init → Check memory for access token
         → If expired → call /auth/refresh (cookie sent automatically)
         → If no cookie → redirect to /login
         → Store new access token in memory (not localStorage/sessionStorage)
```

---

## 10. Mobile Architecture

### Technology: React Native + Expo

- Shared business logic via shared packages where possible
- Native navigation via React Navigation v7
- Native-specific UI via React Native Paper + custom components
- Deep linking configured for workspace and chat routes
- Push notifications via Expo Notifications + backend webhook

### Code Sharing Strategy

| Shareable | Not Shareable |
|---|---|
| RTK Query API slices | Navigation structure |
| Redux slices | Platform-specific UI components |
| Zod validation schemas | Gesture handlers |
| Shared types and contracts | Native permissions |
| Business logic hooks | File system operations |

---

## 11. Performance Strategy

| Strategy | Implementation | Status |
|---|---|---|
| Code splitting | Dynamic imports per route | [TODO: implement] |
| Bundle analysis | `rollup-plugin-visualizer` | [TODO: configure] |
| Image optimization | Modern formats (WebP/AVIF), lazy load | [TODO: implement] |
| Virtual lists | TanStack Virtual for long chat/doc lists | [TODO: implement] |
| Service Worker | Offline caching strategy | [TODO: evaluate] |
| Memoization | `React.memo`, `useMemo`, `useCallback` | Ongoing |
| Web Vitals monitoring | Core Web Vitals in analytics | [TODO: integrate] |

---

## 12. Testing Strategy

| Test Level | Tool | Coverage Target |
|---|---|---|
| Unit (components) | Jest + React Testing Library | 80% |
| Unit (hooks/slices) | Jest | 90% |
| Integration | Jest + MSW (mock service worker) | Key user flows |
| E2E (web) | Playwright | Critical paths |
| E2E (mobile) | Detox | Critical paths |
| Visual regression | Storybook + Chromatic | UI Kit components |
| Accessibility | Axe-core + `@testing-library/jest-axe` | All components |

See [Testing Strategy](./testing.md) for full details.

---

## 13. Future Improvements

- [ ] Implement Module Federation for true runtime MFE composition
- [ ] Add Storybook for UI Kit documentation and visual testing
- [ ] Evaluate React Server Components for document-heavy views
- [ ] Implement i18n (react-i18next) for multi-language support
- [ ] Add Progressive Web App (PWA) capabilities
- [ ] Evaluate Tauri for native desktop app
- [ ] Add E2E encryption indicators in chat UI
- [ ] Integrate WebAssembly for local AI inference (edge)
