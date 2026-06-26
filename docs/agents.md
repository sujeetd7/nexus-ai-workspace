# Agent Runtime Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** AI Engineers, Platform Engineers

---

## Purpose

This document describes the agent runtime architecture within the Nexus AI Kernel. It covers the design of individual agents, the multi-agent orchestration patterns, agent memory, tool integration, and the lifecycle of an agent invocation from client request to streaming response.

---

## Table of Contents

1. [Agent Runtime Overview](#1-agent-runtime-overview)
2. [Agent Taxonomy](#2-agent-taxonomy)
3. [LangGraph State Machine Design](#3-langgraph-state-machine-design)
4. [Multi-Agent Patterns](#4-multi-agent-patterns)
5. [Agent Memory System](#5-agent-memory-system)
6. [Tool Integration](#6-tool-integration)
7. [Agent Invocation Lifecycle](#7-agent-invocation-lifecycle)
8. [Streaming and Real-Time Output](#8-streaming-and-real-time-output)
9. [Error Handling and Recovery](#9-error-handling-and-recovery)
10. [Agent Observability](#10-agent-observability)
11. [Safety and Guardrails](#11-safety-and-guardrails)
12. [Agent Configuration](#12-agent-configuration)
13. [Architectural Tradeoffs](#13-architectural-tradeoffs)
14. [Future Improvements](#14-future-improvements)

---

## 1. Agent Runtime Overview

The Nexus Agent Runtime is built on **LangGraph**, providing stateful, graph-based execution of AI agents. Agents are first-class entities in the platform, each with:

- A defined capability domain (chat, code, document, research)
- Persistent state across multi-turn conversations
- Access to curated tool sets via MCP
- Memory for context retention beyond the LLM context window
- Streaming output for real-time user experience

### Where Agents Live

```
ai/
└── kernel/
    └── core/
        ├── agents/
        │   ├── base_agent.py         # Abstract base class
        │   ├── chat_agent.py         # Conversational agent
        │   ├── document_agent.py     # Document QA and editing agent
        │   ├── code_agent.py         # Code generation and review agent
        │   ├── research_agent.py     # Web + doc research agent
        │   ├── workspace_agent.py    # Cross-workspace synthesis agent
        │   └── supervisor_agent.py   # Multi-agent orchestrator
        └── graphs/
            ├── chat_graph.py
            ├── document_graph.py
            ├── code_graph.py
            ├── research_graph.py
            └── supervisor_graph.py
```

---

## 2. Agent Taxonomy

### Leaf Agents (Single-Domain)

| Agent | Domain | Primary Tools | LLM Model |
|---|---|---|---|
| `ChatAgent` | Conversational AI | `nexus.memory.*`, `nexus.search` | GPT-4o |
| `DocumentAgent` | Document QA | `doc.*`, `nexus.search` | GPT-4o |
| `CodeAgent` | Code intelligence | `code.*`, `github.*` | GPT-4o + Codestral |
| `ResearchAgent` | Information research | `web_search`, `doc.*`, `url_reader` | GPT-4o |
| `WorkspaceAgent` | Workspace context | `workspace.*`, `nexus.*` | GPT-4o-mini |

### Orchestrator Agents

| Agent | Pattern | Spawns | Use Case |
|---|---|---|---|
| `SupervisorAgent` | Supervisor / Router | Any leaf agent | Complex tasks requiring multiple domains |
| `PlannerAgent` | Plan-and-Execute | Any leaf agent | Long-horizon tasks with step planning |

---

## 3. LangGraph State Machine Design

### State Shape (Generic)

```python
# Placeholder — do not implement yet
class AgentState(TypedDict):
    session_id: str
    user_id: str
    workspace_id: str
    messages: list[BaseMessage]        # Full conversation history
    working_memory: dict               # Short-term scratch space
    tool_calls: list[ToolCall]         # This turn's tool invocations
    tool_results: list[ToolResult]     # Results from tool calls
    plan: Optional[list[str]]          # For plan-and-execute agents
    current_step: Optional[int]        # Current plan step index
    response: Optional[str]            # Final response (when complete)
    error: Optional[str]               # Error state
    metadata: dict                     # Routing metadata, flags
```

### Standard Graph Structure (ReAct Pattern)

```
[START]
   │
   ▼
┌──────────────┐
│  parse_input │  Validate, enrich request, load memory
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  reason      │  LLM: decide next action (respond or use tool)
└──────┬───────┘
       │
   ┌───┴───────────┐
   │               │
   ▼               ▼
┌──────┐     ┌──────────────┐
│ END  │     │  call_tools  │  Execute selected MCP tools
└──────┘     └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │ process_tools│  Parse tool results, handle errors
             └──────┬───────┘
                    │
                    └────── → reason (loop back)
```

### Conditional Routing

- `should_continue()` — returns `"tools"` or `"end"` based on LLM output
- `handle_error()` — routes to `"retry"`, `"fallback"`, or `"error_response"`
- `route_to_agent()` — supervisor routing to specialized leaf agents

---

## 4. Multi-Agent Patterns

### Pattern 1: Supervisor / Router

```
User Request
     │
     ▼
SupervisorAgent
     │
     ├── Task: "summarize this PDF" → DocumentAgent
     ├── Task: "write unit tests" → CodeAgent
     ├── Task: "research competitors" → ResearchAgent
     └── Task: "general chat" → ChatAgent
     │
     ▼
Aggregated Response → User
```

### Pattern 2: Plan-and-Execute

```
User Request: "Research competitors, summarize findings, create a report"
     │
PlannerAgent:
  Plan: [
    1. Use ResearchAgent to gather competitor data
    2. Use DocumentAgent to structure findings
    3. Use WorkspaceAgent to save report to workspace
  ]
     │
Execute steps sequentially, passing context between steps
     │
Final structured report → User
```

### Pattern 3: Parallel Sub-Agents

```
User Request: "Analyze all documents in project X"
     │
     ▼
DocumentAgent spawns parallel sub-tasks:
  ├── Sub-agent 1: doc_id_001
  ├── Sub-agent 2: doc_id_002
  └── Sub-agent 3: doc_id_003
     │
Merge results, synthesize unified analysis
     │
Response → User
```

### Agent Communication

- Agents communicate via state passing — no direct agent-to-agent calls
- Supervisor passes task context in `AgentState.working_memory`
- Results accumulated in `AgentState.messages`
- [TODO: Evaluate A2A (Agent-to-Agent) protocol]

---

## 5. Agent Memory System

### Memory Hierarchy

```
┌─────────────────────────────────────────────────────┐
│  Context Window (current LLM call)                  │
│  System prompt + recent messages + tool results     │
│  Limit: model-specific (128k for GPT-4o)            │
├─────────────────────────────────────────────────────┤
│  Session Memory (Redis)                             │
│  Full turn history for active session               │
│  TTL: 24 hours                                      │
├─────────────────────────────────────────────────────┤
│  Summary Memory (Redis)                             │
│  Compressed summary when history > threshold        │
│  Updated every N turns                              │
├─────────────────────────────────────────────────────┤
│  Entity Memory (Redis)                              │
│  Extracted people, projects, decisions              │
│  Scoped to session + workspace                      │
├─────────────────────────────────────────────────────┤
│  Long-Term Memory (ChromaDB + PostgreSQL)           │
│  Persisted facts and preferences                    │
│  Semantic search via embeddings                     │
└─────────────────────────────────────────────────────┘
```

### Memory Operations

| Operation | When | Implementation |
|---|---|---|
| Memory load | Session start | Redis lookup → prepend to messages |
| Memory update | Each turn end | Async write to Redis |
| Summarize | Buffer > 50 messages | LLM summarization chain |
| Entity extraction | Each turn | Extraction chain → Redis set |
| Long-term store | Significant events | Embedding → ChromaDB upsert |
| Memory recall | Agent explicit request | `nexus.memory.recall` tool |

---

## 6. Tool Integration

### Tool Access Pattern

- Each agent is initialized with a curated tool list (not all available tools)
- Tools fetched from MCP registry at agent startup
- LangChain `Tool` wrappers created dynamically from MCP schemas
- Tool selection done by LLM via OpenAI function calling format

### Tool Execution Flow

```
LLM selects tool + parameters
         │
         ▼
LangGraph ToolNode receives tool_calls from state
         │
         ▼
MCP Client invokes tool on appropriate server
         │
         ├── Success → result added to state.tool_results
         └── Error → retry logic → fallback → error state
         │
         ▼
Tool results injected into next LLM context as ToolMessage
```

### Tool Safety Controls

| Control | Implementation |
|---|---|
| Allowlist per agent | Each agent type has explicit tool allowlist |
| User permission check | Tool server enforces RBAC on invocation |
| Output size limits | Tool results truncated at 4096 tokens |
| Timeout | 30-second timeout per tool call |
| Retry | 2 retries with exponential backoff |

---

## 7. Agent Invocation Lifecycle

### Request Flow

```
1. Client sends POST /agents/invoke
2. FastAPI validates request schema
3. Session ID resolved (new or existing)
4. Memory loaded for session
5. AgentState initialized
6. LangGraph graph.astream() called
7. Tokens streamed via SSE to client
8. Final state persisted (memory, checkpoints)
9. Audit log written
10. Metrics recorded
```

### Session Management

- Session ID is `{user_id}:{workspace_id}:{conversation_id}`
- Session state stored in Redis with 24h TTL
- Persistent sessions stored in PostgreSQL (for history retrieval)
- Each invocation restores state from checkpoint

---

## 8. Streaming and Real-Time Output

### Streaming Implementation

- LangGraph `astream_events()` used for fine-grained event streaming
- Events converted to SSE format for HTTP delivery
- Event types streamed to client:

| Event Type | Payload | Client Action |
|---|---|---|
| `token` | `{ content: string }` | Append to message buffer |
| `tool_start` | `{ tool_name, input }` | Show tool loading indicator |
| `tool_end` | `{ tool_name, output }` | Hide indicator |
| `agent_start` | `{ agent_name }` | Show thinking indicator |
| `agent_end` | `{ metadata }` | Mark response complete |
| `error` | `{ code, message }` | Show error state |

### Client Handling

- Web client uses `EventSource` API to consume SSE
- React state appends tokens to message in real-time
- Tool events rendered as inline activity cards

---

## 9. Error Handling and Recovery

### Error Categories

| Category | Examples | Recovery Strategy |
|---|---|---|
| LLM Error | Rate limit, timeout, content filter | Retry with fallback model |
| Tool Error | Tool server down, permission denied | Retry → skip tool → inform user |
| State Error | Invalid state transition | Log + reset to last valid checkpoint |
| Input Error | Malformed request | Return 400 immediately |
| Memory Error | Redis unavailable | Continue without memory load (log warning) |

### Max Iterations Guard

- Each agent has a configurable `max_iterations` (default: 25)
- Prevents infinite tool call loops
- Exceeding limit triggers graceful termination with partial response

---

## 10. Agent Observability

| Signal | Details | Tool |
|---|---|---|
| Agent invocation count | Per agent type, per user | Prometheus |
| Invocation latency (E2E) | P50/P95/P99 | Prometheus |
| TTFB (time to first token) | Per invocation | Prometheus |
| Tool call count | Per agent, per tool | Prometheus |
| LLM token usage | Input/output tokens per invocation | Custom metric |
| Error rate | Per error category | Prometheus |
| Full trace | Prompt, tools, response | LangSmith |
| Audit log | User, agent, tools used, response hash | Structured log |

---

## 11. Safety and Guardrails

### Input Guardrails

- Prompt injection detection (keyword + classifier-based)
- PII detection before sending to external LLM providers
- Content policy filter on user input
- Maximum input length enforcement

### Output Guardrails

- Output moderation via OpenAI Moderation API
- Sensitive data masking in responses (credit cards, SSNs)
- Agent cannot execute destructive tools without explicit user confirmation
- All tool outputs sanitized before LLM context injection

---

## 12. Agent Configuration

Each agent type is configurable via `ai/config/agents.yaml`:

```yaml
# Placeholder structure — do not implement yet
agents:
  chat_agent:
    model: gpt-4o
    temperature: 0.7
    max_tokens: 2048
    max_iterations: 20
    tools:
      - nexus.memory.*
      - nexus.search
    memory:
      type: buffer_summary
      max_buffer: 50
  code_agent:
    model: gpt-4o
    temperature: 0.2
    max_tokens: 4096
    max_iterations: 15
    tools:
      - code.*
      - github.*
```

---

## 13. Architectural Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| LangGraph over simple chains | Stateful, cyclical, complex workflows | Higher complexity |
| Tool allowlists per agent | Security, focus | Must maintain per-agent allowlists |
| Redis for session state | Fast, ephemeral | Data loss on Redis failure |
| Single agent service | Simple deployment | Harder to scale specific agent types |
| Streaming from LLM to client | Real-time UX | Complex error handling mid-stream |

---

## 14. Future Improvements

- [ ] Implement long-horizon planning with ToT (Tree of Thoughts)
- [ ] Add agent-to-agent (A2A) protocol for dynamic delegation
- [ ] Build visual agent trace viewer in admin UI
- [ ] Add user-adjustable agent personas
- [ ] Implement RLHF feedback loop on agent responses
- [ ] Build agent testing harness with golden dataset evaluation
- [ ] Add multi-modal agents (image understanding, audio transcription)
- [ ] Implement agent capability self-discovery
