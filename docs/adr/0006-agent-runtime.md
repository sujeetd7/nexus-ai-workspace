# ADR-0006: Agent Runtime Architecture

> **ID:** ADR-0006
> **Title:** Agent Runtime Architecture — LangGraph State Machines and Multi-Agent Orchestration
> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Principal Staff Engineer, AI/ML Lead, Platform Lead
> **Supersedes:** N/A
> **Superseded By:** N/A

---

## Context

The agent runtime is the execution engine that powers all AI-driven workflows in Nexus AI Workspace. It must execute multi-turn conversations, invoke tools, manage memory, orchestrate multi-agent workflows, and stream results to users in real time.

This ADR addresses the specific architectural decisions within the agent runtime layer, building on the AI kernel framework selection (ADR-0005). Specifically, we must decide:

1. How agents are defined and structured (state machine vs. chain vs. DAG)
2. How agent memory is managed across turns
3. How multiple agents coordinate on complex tasks
4. How tool calls are executed safely and reliably
5. How agent outputs are streamed to clients

### Forces at Play

- Users expect sub-second time-to-first-token for AI responses
- Complex tasks (research, code review) require multiple reasoning steps and tool calls
- Agents must maintain context across an entire conversation session
- Some tasks benefit from parallel execution (e.g., analyzing multiple documents simultaneously)
- Enterprise customers require auditability: every agent decision must be traceable
- Agent safety is critical: agents must not perform unauthorized actions

### Technical Constraints

- Must integrate with MCP for all external tool access
- Must produce SSE-compatible streaming output
- Must support session persistence across browser sessions
- LangGraph (selected in ADR-0005) is the execution engine

---

## Decision

### Decision 1: ReAct (Reason + Act) as the Primary Agent Pattern

We use the **ReAct (Reason + Act)** pattern as the core execution model for all agents. In LangGraph terms, this is a cyclic graph with two primary nodes:

1. **reason** — LLM decides whether to respond or invoke a tool
2. **act** (call_tools) — Execute the selected tool(s)

The cycle repeats until the LLM decides to produce a final response.

**Rationale:** ReAct is the most battle-tested, debuggable, and well-supported agent pattern. It maps naturally to LangGraph's cyclic graph model and aligns with OpenAI function calling and Claude tool use APIs.

**Alternative patterns** (Tree of Thoughts, Plan-and-Execute) are reserved for specific high-complexity agents where ReAct's greedy decision-making is insufficient.

### Decision 2: Typed State Machine via TypedDict

Every agent graph operates on a **typed `AgentState`** dataclass (TypedDict). State is the single source of truth for all agent data within an invocation. Nodes are pure functions: `(state) → state`.

**Rationale:** Typed state makes agent behavior testable, predictable, and inspectable. LangGraph's checkpointing serializes state — it must be a plain data structure.

### Decision 3: Three-Tier Memory Architecture

Agent memory is organized in three tiers, each with a different scope and TTL:

| Tier                 | Storage               | Scope                   | TTL       |
| -------------------- | --------------------- | ----------------------- | --------- |
| **Session memory**   | Redis                 | Per conversation        | 24 hours  |
| **Entity memory**    | Redis                 | Per session + workspace | 24 hours  |
| **Long-term memory** | ChromaDB + PostgreSQL | Per user                | Permanent |

**Rationale:** A single memory strategy cannot satisfy all needs. Buffer memory for recency, entity memory for structured facts, and vector memory for semantic recall are complementary. The tiered approach balances cost, speed, and recall quality.

### Decision 4: Supervisor Pattern for Multi-Agent Orchestration

For tasks requiring multiple specialized domains (e.g., "research competitors and write a technical summary"), we use a **Supervisor agent** that routes subtasks to specialized leaf agents:

```
User Request → SupervisorAgent → route → SpecializedAgent(s) → aggregate → Response
```

The supervisor operates as a LangGraph subgraph. Leaf agents are also LangGraph subgraphs, composable within the supervisor graph via `add_subgraph`.

**Alternative (rejected): Peer-to-peer agent communication** — agents spawning other agents directly without a supervisor. This was rejected because it is harder to audit, debug, and control. A supervisor provides a single coordination point and a clear delegation chain.

### Decision 5: MCP as the Universal Tool Protocol

All agent tool calls — without exception — go through the MCP registry. Agents do not call APIs, databases, or external services directly. Every external interaction is a typed MCP tool call.

**Rationale:** This constraint provides:

- Centralized audit log of all tool invocations
- Uniform permission enforcement at the tool server level
- Tool replaceability without agent code changes
- Tool call tracing and debugging via registry

**Implication:** Every new external capability an agent needs must first be exposed as an MCP tool. This adds a small upfront cost but provides a large long-term benefit.

### Decision 6: Streaming via LangGraph astream_events()

All agent invocations use LangGraph's `astream_events()` method, which emits fine-grained events for every LLM token, tool call start, tool call end, and node transition.

These events are mapped to a typed SSE event schema and streamed to clients via FastAPI's `StreamingResponse`.

**Rationale:** Token-level streaming is a hard UX requirement. LangGraph's event stream provides the granularity needed to render a responsive chat UI with tool activity indicators.

### Decision 7: Per-Agent Tool Allowlists

Each agent type has an explicit, curated list of allowed tools. Agents cannot invoke tools outside their allowlist, regardless of what the MCP registry exposes.

**Rationale:** Defense in depth for agent safety. Even if the LLM reasons that a destructive tool call is appropriate, it cannot execute if the tool is not in the agent's allowlist.

### Decision 8: Max Iterations Guard

Every agent execution has a configurable `max_iterations` limit (default: 25 cycles). Exceeding this limit terminates the agent with a partial response and a user-facing warning.

**Rationale:** Prevents infinite tool call loops, protects against prompt injection attacks that try to keep the agent looping, and controls LLM API costs.

---

## Considered Alternatives

### Alternative: Plan-and-Execute as Default Pattern

**Description:** All agents first create a full plan (list of steps), then execute each step in sequence.

**Pros:**

- Better for long-horizon tasks
- Plan is visible to the user upfront
- Easier to parallelize independent steps

**Cons:**

- Plans become stale when early steps yield unexpected results
- Adds a full LLM call upfront before any work begins
- Increases TTFB (time to first meaningful output)
- Most user requests do not require explicit planning

**Reason rejected as default:** ReAct's greedy approach is faster and sufficient for the majority of user requests. Plan-and-Execute is implemented for the `ResearchAgent` and `PlannerAgent` where it adds meaningful value.

### Alternative: Agent Communication via Message Queue

**Description:** Agents publish results to a message queue; other agents subscribe and react.

**Pros:**

- Decoupled, event-driven agent composition
- Natural retry and backoff for failed agent subtasks

**Cons:**

- Non-deterministic execution order
- Hard to implement streaming responses (what token goes where?)
- Significantly more complex orchestration than supervisor pattern
- Debugging agent interactions across a queue is extremely difficult

**Reason rejected:** The synchronous, graph-based model of LangGraph provides better determinism, debuggability, and streaming support. Message queue agent communication is reserved for future background AI workflows (not user-facing).

### Alternative: Shared Global Tool Context (No Allowlists)

**Description:** All agents have access to all registered MCP tools.

**Pros:**

- Simpler configuration
- Agents can use any tool they reason is appropriate

**Cons:**

- No enforcement boundary: a compromised prompt could invoke destructive tools
- LLM tool selection degrades when too many tools are available (token context, confusion)
- No clear ownership of which tools belong to which agent domain

**Reason rejected:** Per-agent allowlists are a critical safety control. Research shows LLM tool selection accuracy degrades with more than ~10 available tools. Curated per-agent tool lists improve both safety and performance.

### Alternative: Client-Side Streaming (WebSocket Instead of SSE)

**Description:** Agent output streamed to clients via WebSocket instead of SSE.

**Pros:**

- Bidirectional: client can cancel or send follow-up while streaming
- Single protocol for all real-time communication

**Cons:**

- SSE is simpler to implement and sufficient for unidirectional streaming
- SSE is natively supported by `EventSource` in browsers without additional libraries
- WebSocket requires more complex connection management on the AI platform
- Cancellation can be implemented via a separate REST call

**Reason rejected:** SSE is sufficient for the streaming use case and significantly simpler than WebSocket for the AI platform. WebSocket is used elsewhere in the platform (chat service) where bidirectionality is required.

---

## Consequences

### Positive

- ReAct pattern is well-understood, debuggable, and testable
- Typed state makes agent behavior deterministic and inspectable
- Tiered memory provides the right tradeoff between cost and context quality
- Supervisor pattern enables complex multi-domain tasks without uncontrolled agent spawning
- MCP-only tool access provides a strong safety and auditability boundary
- Per-agent tool allowlists limit blast radius of compromised prompts

### Negative

- **Complexity** — LangGraph state machines have a learning curve for engineers new to graph-based programming
- **Tool allowlist maintenance** — Must update allowlists when new tools are added to MCP registry
- **Memory tier coordination** — Bugs can emerge from inconsistencies between memory tiers
- **Streaming complexity** — Mapping LangGraph events to SSE events requires careful handling of partial states and errors

### Mitigations

- Comprehensive agent documentation and tutorials for the engineering team
- `allow_all_tools: false` is the default; explicit opt-in required for new tools
- Memory tier consistency tests in the integration test suite
- Streaming error boundaries: if stream fails mid-response, client receives a graceful error message

### Risks

| Risk                                            | Likelihood | Mitigation                                                    |
| ----------------------------------------------- | ---------- | ------------------------------------------------------------- |
| Prompt injection via tool results               | Low        | Tool output sanitization, context length limits               |
| Agent gets stuck in tool call loop              | Low        | Max iterations guard, loop detection                          |
| Memory tier inconsistency (stale entity memory) | Medium     | TTL-based expiry, explicit invalidation on workspace change   |
| Supervisor misroutes complex tasks              | Medium     | Routing tests in golden dataset, fallback to generalist agent |

---

## Evaluation Criteria

All agent runtime changes must pass the following before deployment:

| Criterion                  | Minimum Threshold   | Measurement               |
| -------------------------- | ------------------- | ------------------------- |
| Task success rate          | 90%                 | Golden dataset evaluation |
| Tool selection accuracy    | 85%                 | Annotation comparison     |
| TTFB (time to first token) | P90 < 1000ms        | Prometheus histogram      |
| Max iterations triggered   | < 1% of invocations | Prometheus counter        |
| Hallucination rate         | < 5%                | LLM-as-judge evaluation   |

---

## Related Decisions

- [ADR-0005: AI Kernel Design](./0005-ai-kernel.md)
- [ADR-002: AI Kernel + LangGraph + FastMCP](./ADR-002-ai-kernel-langgraph-fastmcp.md)
- [Agent Runtime Architecture](../agents.md)
- [MCP Architecture](../mcp.md)
