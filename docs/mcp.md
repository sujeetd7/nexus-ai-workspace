# MCP Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** Platform Engineers, AI Engineers

---

## Purpose

This document defines the Model Context Protocol (MCP) architecture within Nexus AI Workspace. It covers the MCP server registry, individual server design, the shared SDK, and how MCP enables the AI kernel and external IDE clients to interact with platform tools in a standardized way.

---

## Table of Contents

1. [MCP Overview](#1-mcp-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [MCP Directory Structure](#3-mcp-directory-structure)
4. [MCP Server Catalog](#4-mcp-server-catalog)
5. [MCP Registry](#5-mcp-registry)
6. [MCP SDK](#6-mcp-sdk)
7. [FastMCP Integration](#7-fastmcp-integration)
8. [Tool Definition Standards](#8-tool-definition-standards)
9. [Authentication & Security](#9-authentication--security)
10. [Client Integration](#10-client-integration)
11. [Observability](#11-observability)
12. [Architectural Tradeoffs](#12-architectural-tradeoffs)
13. [Future Improvements](#13-future-improvements)

---

## 1. MCP Overview

The **Model Context Protocol (MCP)** is an open standard for connecting AI models to external tools, data sources, and services. In Nexus AI Workspace, MCP serves as the universal protocol layer between:

- The **AI Kernel** (LangGraph agents that invoke tools)
- The **MCP Server Registry** (catalog of available tool servers)
- **External clients** (VSCode Copilot extension, third-party IDE plugins)
- **Platform services** (document management, workspace context, code tools)

### Key Concepts

| Concept | Description |
|---|---|
| **MCP Server** | A service that exposes tools, resources, and prompts via the MCP protocol |
| **MCP Client** | A consumer that connects to MCP servers and invokes tools |
| **Tool** | A callable function exposed by an MCP server with typed input/output schema |
| **Resource** | A data source exposed by an MCP server (files, database records) |
| **Prompt** | A reusable prompt template exposed by an MCP server |
| **Registry** | Central discovery service for all MCP servers in the platform |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client Layer                         │
│                                                             │
│  ┌──────────────────┐      ┌──────────────────────────┐    │
│  │  AI Kernel       │      │  VSCode Copilot Ext.     │    │
│  │  LangGraph Agent │      │  (External MCP Client)   │    │
│  └────────┬─────────┘      └────────────┬─────────────┘    │
└───────────┼────────────────────────────┼─────────────────── ┘
            │ MCP Protocol               │ MCP Protocol
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Registry                             │
│  (Tool discovery, health checking, routing)                 │
└──┬──────────────┬──────────────┬──────────────┬────────────┘
   │              │              │              │
   ▼              ▼              ▼              ▼
┌──────┐    ┌──────────┐  ┌──────────┐  ┌──────────────┐
│Nexus │    │ GitHub   │  │ Document │  │  Workspace   │
│Core  │    │  MCP     │  │  MCP     │  │    MCP       │
│ MCP  │    │          │  │          │  │              │
└──────┘    └──────────┘  └──────────┘  └──────────────┘
   │
┌──────────────┐
│   Code MCP   │
└──────────────┘
```

---

## 3. MCP Directory Structure

```
mcp/
├── registry/
│   ├── src/
│   │   ├── server.ts           # Registry HTTP server
│   │   ├── discovery.ts        # Server registration + health checks
│   │   ├── router.ts           # Tool call routing to appropriate server
│   │   └── types.ts            # Registry-specific types
│   └── tests/
├── sdk/
│   ├── src/
│   │   ├── client.ts           # MCP client wrapper (TypeScript)
│   │   ├── server.ts           # MCP server base class (TypeScript)
│   │   ├── types.ts            # Shared MCP types
│   │   └── index.ts            # SDK public API
│   └── tests/
├── servers/
│   ├── nexus-core/             # Platform core tools
│   ├── github-mcp/             # GitHub repository tools
│   ├── document-mcp/           # Document parsing and search tools
│   ├── workspace-mcp/          # Workspace context tools
│   └── code-mcp/               # Code assistance tools
└── config/
    └── registry.json           # Registry server list configuration
```

---

## 4. MCP Server Catalog

### Nexus Core MCP (`servers/nexus-core/`)

The primary MCP server exposing core platform capabilities.

| Tool | Description | Input | Output |
|---|---|---|---|
| `nexus.search` | Search across all workspace content | `{ query, scope, limit }` | `{ results: SearchResult[] }` |
| `nexus.user.get` | Get user profile and preferences | `{ user_id }` | `{ user: UserProfile }` |
| `nexus.workspace.list` | List accessible workspaces | `{ user_id }` | `{ workspaces: Workspace[] }` |
| `nexus.memory.recall` | Retrieve from long-term agent memory | `{ query, session_id }` | `{ memories: Memory[] }` |
| `nexus.memory.store` | Store to long-term agent memory | `{ content, session_id, tags }` | `{ id: string }` |

### GitHub MCP (`servers/github-mcp/`)

GitHub repository and code intelligence tools.

| Tool | Description | Input | Output |
|---|---|---|---|
| `github.repo.search` | Search repositories | `{ query, org }` | `{ repos: Repo[] }` |
| `github.code.search` | Search code across repos | `{ query, lang, repo }` | `{ matches: CodeMatch[] }` |
| `github.pr.list` | List pull requests | `{ repo, state, author }` | `{ prs: PR[] }` |
| `github.issue.create` | Create a new issue | `{ repo, title, body, labels }` | `{ issue: Issue }` |
| `github.file.read` | Read file content from repo | `{ repo, path, ref }` | `{ content: string }` |

### Document MCP (`servers/document-mcp/`)

Document parsing, search, and annotation tools.

| Tool | Description | Input | Output |
|---|---|---|---|
| `doc.search` | Semantic search in indexed documents | `{ query, workspace_id, top_k }` | `{ results: DocChunk[] }` |
| `doc.get` | Retrieve document content | `{ document_id }` | `{ document: Document }` |
| `doc.summarize` | AI-powered document summary | `{ document_id, length }` | `{ summary: string }` |
| `doc.extract` | Extract structured data from document | `{ document_id, schema }` | `{ data: Record }` |
| `doc.annotate` | Add annotation to document | `{ document_id, text, position }` | `{ annotation_id: string }` |

### Workspace MCP (`servers/workspace-mcp/`)

Organizational context and team tools.

| Tool | Description | Input | Output |
|---|---|---|---|
| `workspace.context.get` | Get workspace AI context | `{ workspace_id }` | `{ context: WorkspaceContext }` |
| `workspace.members.list` | List workspace members | `{ workspace_id }` | `{ members: Member[] }` |
| `workspace.channel.list` | List chat channels | `{ workspace_id }` | `{ channels: Channel[] }` |
| `workspace.settings.get` | Get workspace AI settings | `{ workspace_id }` | `{ settings: AISettings }` |

### Code MCP (`servers/code-mcp/`)

Code intelligence, completion, and review tools.

| Tool | Description | Input | Output |
|---|---|---|---|
| `code.complete` | Code completion at cursor | `{ code, language, position }` | `{ completions: string[] }` |
| `code.explain` | Explain code block | `{ code, language }` | `{ explanation: string }` |
| `code.review` | AI code review | `{ code, language, context }` | `{ review: CodeReview }` |
| `code.test.generate` | Generate test cases | `{ code, language, framework }` | `{ tests: string }` |
| `code.refactor` | Suggest refactoring | `{ code, language, goal }` | `{ refactored: string, diff: string }` |

---

## 5. MCP Registry

### Responsibilities

- Maintains a catalog of all available MCP servers
- Health checks servers periodically (liveness + readiness)
- Routes tool invocation requests to the correct server
- Provides tool discovery endpoint for AI kernel initialization
- Returns capability manifest to clients on connect

### Registration Protocol

1. MCP server starts and registers itself with the registry via `POST /registry/register`
2. Registry performs initial health check
3. Server added to active catalog
4. AI kernel polls registry or receives push notification of new tools
5. On server shutdown, deregistration via `DELETE /registry/{server_id}`

### Discovery Endpoint

```
GET /registry/tools
Response: {
  servers: [
    {
      id: "nexus-core",
      name: "Nexus Core MCP",
      version: "1.0.0",
      status: "healthy",
      tools: [ ToolSchema[] ],
      resources: [ ResourceSchema[] ]
    },
    ...
  ]
}
```

---

## 6. MCP SDK

### TypeScript SDK (`sdk/`)

Provides typed wrappers for both MCP server and MCP client roles.

#### Server SDK

```typescript
// Placeholder — do not implement yet
class NexusMCPServer extends MCPServerBase {
  // Register tools declaratively
  // Handle tool invocations
  // Emit structured errors
  // Integrate with registry on startup/shutdown
}
```

#### Client SDK

```typescript
// Placeholder — do not implement yet
class NexusMCPClient {
  // Connect to registry
  // Discover available tools
  // Invoke tools with typed input/output
  // Handle streaming tool responses
}
```

---

## 7. FastMCP Integration

The AI Kernel uses **FastMCP** (Python) to expose the kernel's own capabilities as an MCP server and to create lightweight MCP tool wrappers.

- FastMCP decorators used to define tools in the `nexus-core` Python module
- Tool schemas automatically generated from Python type annotations
- ASGI-compatible: mounted alongside FastAPI app for unified deployment
- Used for rapid prototyping of new AI tools before TypeScript promotion

---

## 8. Tool Definition Standards

### Tool Naming Convention

```
{server_name}.{resource_type}.{action}

Examples:
  github.pr.list
  doc.search
  nexus.memory.recall
```

### Tool Schema Requirements

Every tool must define:

1. **Name** — dot-notation identifier
2. **Description** — clear, one-sentence description for LLM tool selection
3. **Input schema** — JSON Schema with required/optional fields and descriptions
4. **Output schema** — JSON Schema of success response
5. **Error schema** — Typed error codes returned on failure
6. **Idempotency** — whether the tool is safe to retry

### Error Response Shape

```json
{
  "error": {
    "code": "TOOL_NOT_FOUND | PERMISSION_DENIED | RATE_LIMITED | TOOL_EXECUTION_ERROR",
    "message": "Human-readable description",
    "retryable": true
  }
}
```

---

## 9. Authentication & Security

### Client Authentication

- MCP clients authenticate to the registry with a platform API key
- API keys scoped to specific tool namespaces (e.g., `github.*` only)
- Keys rotated quarterly; revocable immediately

### Tool-Level Authorization

- Tool invocations carry the original user's JWT claims
- MCP servers enforce RBAC using the user's role from claims
- Sensitive tools (e.g., `github.issue.create`) require explicit permission grants

### Transport Security

- All MCP traffic over HTTPS in production
- mTLS between registry and servers in production ([TODO: implement])
- No direct tool server exposure to external network

---

## 10. Client Integration

### AI Kernel (Primary Client)

- Kernel initializes by fetching tool manifest from registry at startup
- Tools wrapped as `LangChain Tool` objects for use in LangGraph agents
- Tool calls are logged with correlation ID for traceability

### VSCode Copilot Extension (External Client)

- Uses `@nexus/mcp-sdk` to connect to the registry
- Tool discovery performed on workspace open
- Tool calls include user context (current file, selection, workspace)
- Streaming tool responses rendered inline in the editor

### Web App (Future)

- [TODO: evaluate direct MCP tool calls from the frontend for chat commands]

---

## 11. Observability

| Signal | Implementation | Status |
|---|---|---|
| Tool invocation count | Prometheus counter per tool | [TODO: implement] |
| Tool execution latency | Prometheus histogram | [TODO: implement] |
| Tool error rate | Prometheus counter per error code | [TODO: implement] |
| Registry health | `/health` endpoint + alerting | [TODO: implement] |
| Tool call audit log | Structured log per invocation | [TODO: implement] |

---

## 12. Architectural Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Central registry over direct connections | Simplified discovery, health monitoring | Registry as potential single point of failure |
| Protocol-level tool abstraction | Provider independence, extensibility | Additional indirection and latency |
| Typed SDK over raw protocol | Developer experience, type safety | SDK maintenance overhead |
| FastMCP for Python servers | Rapid development | Python-specific, separate from TS servers |
| Tool namespacing | Clear ownership, permission scoping | Verbose tool names |

---

## 13. Future Improvements

- [ ] Implement registry high-availability (active-active)
- [ ] Add streaming tool responses for long-running operations
- [ ] Build tool marketplace for third-party MCP server registration
- [ ] Add tool versioning (breaking change management)
- [ ] Implement tool usage quotas per workspace
- [ ] Add mTLS between registry and all MCP servers
- [ ] GraphQL introspection endpoint for tool schema browsing
- [ ] MCP tool simulation/testing sandbox
