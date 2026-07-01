# ADR-0005: AI Kernel Design

> **ID:** ADR-0005
> **Title:** AI Kernel Design — LangChain, LangGraph, and Provider Abstraction
> **Status:** Accepted
> **Date:** 2026-06-27
> **Deciders:** Principal Staff Engineer, AI/ML Lead, Platform Lead
> **Supersedes:** N/A
> **Superseded By:** N/A

---

## Context

The AI Kernel is the most strategically important architectural component of Nexus AI Workspace. It must support:

- Multi-turn, stateful conversational agents
- Retrieval-Augmented Generation (RAG) over user documents
- Tool use and multi-step reasoning
- Multiple LLM providers with failover and cost optimization
- Streaming responses for real-time user experience
- Extensibility for new AI capabilities without rewrites

We must choose the framework(s), programming language, and design patterns for this kernel. This decision affects AI feature capability, developer productivity, cost, and long-term extensibility.

### Forces at Play

- LLM providers change rapidly; we cannot hard-code to a single provider
- Stateful multi-agent workflows require more than simple prompt-response chains
- The Python ML ecosystem is significantly more mature than Node.js for AI
- RAG pipeline requires document chunking, embedding, vector storage, and retrieval — specialized concerns
- Enterprise customers require AI quality guarantees, not just "it sometimes works"
- Streaming is a hard UX requirement — agents that take 30 seconds to respond are not acceptable

### Technical Constraints

- Must integrate with MCP for tool access (ADR-002 companion)
- Must support OpenAI, Anthropic, and GitHub Models out of the box
- Must expose FastAPI HTTP endpoints for consumption by Node.js backend services
- Must support Server-Sent Events (SSE) for streaming to the frontend

---

## Decision

We adopt the following AI Kernel design:

### Language: Python

The AI Kernel is built entirely in Python. The LangChain, LangGraph, LlamaIndex, and LlamaParse ecosystems are Python-native and significantly more mature than their JavaScript equivalents. The Python async stack (asyncio + FastAPI + uvicorn) provides excellent I/O performance for LLM streaming.

### Framework: LangChain + LangGraph

**LangChain** provides:

- Chain composition primitives (LCEL — LangChain Expression Language)
- Provider-agnostic LLM interface (`ChatOpenAI`, `ChatAnthropic`, etc.)
- Memory implementations (buffer, summary, entity)
- Tool abstraction for function calling
- Prompt templates and management

**LangGraph** provides:

- Stateful, cyclic agent graphs (critical for multi-turn agents)
- Checkpointing for persistent agent state (Redis / PostgreSQL)
- Streaming events at the graph level (fine-grained control)
- Conditional routing between graph nodes (ReAct loop, plan-and-execute)
- Multi-agent subgraph composition

**Together:** LangChain provides the building blocks; LangGraph provides the execution engine for stateful workflows. They are complementary, not competing.

### RAG Stack: LlamaIndex + LlamaParse + ChromaDB

**LlamaIndex** provides index management, query engines, and document data connectors. Its abstraction layer over vector stores (ChromaDB in our case) allows future migration to alternative stores without rewriting RAG logic.

**LlamaParse** provides high-fidelity extraction from PDFs, Word documents, and presentations — far superior to naive text extraction for complex enterprise documents.

**ChromaDB** provides local, embeddable vector storage for development and initial production deployment.

### Service Architecture: FastAPI Microservices

The AI Kernel is decomposed into specialized FastAPI services:

| Service             | Responsibility                                |
| ------------------- | --------------------------------------------- |
| `agent-service`     | LangGraph agent execution, session management |
| `rag-service`       | Document indexing, semantic search            |
| `inference-service` | Direct LLM calls, provider routing, streaming |
| `document-ai`       | LlamaParse extraction, enrichment             |

Each service is independently deployable. All services are mounted behind the AI platform's internal ASGI router.

### Provider Abstraction

All LLM provider calls go through a `BaseLLMProvider` abstract interface. Concrete implementations exist for OpenAI, Anthropic, and GitHub Models. The inference service routes requests based on:

1. Explicit model selection by the caller
2. Availability (primary → secondary fallback)
3. Cost optimization rules (configurable per workspace)

### Evaluation-Driven Development

Every agent and RAG pipeline change requires evaluation against a golden dataset before deployment. RAGAS metrics (faithfulness, relevancy, precision, recall) are computed in CI. A regression in any metric below threshold is a deployment blocker.

---

## Considered Alternatives

### Alternative 1: LangChain Only (No LangGraph)

**Description:** Use LangChain chains for all AI workflows, without LangGraph for agent state management.

**Pros:**

- Simpler learning curve
- Sufficient for simple Q&A and summarization tasks

**Cons:**

- LangChain chains are stateless and acyclic — cannot represent multi-turn agent loops natively
- Multi-step tool use (ReAct) requires manual implementation without LangGraph's graph primitives
- Checkpointing for session persistence requires custom implementation
- Streaming at the agent level is more complex without LangGraph's event stream

**Reason rejected:** The platform's agents require stateful, cyclical execution graphs with tool calls and persistent session state. LangChain chains alone are insufficient for this.

### Alternative 2: CrewAI

**Description:** Use CrewAI as the multi-agent orchestration framework instead of LangGraph.

**Pros:**

- Higher-level abstraction ("roles" and "tasks") maps well to human workflows
- Faster initial agent setup

**Cons:**

- Less control over execution graph (opinionated role-based model)
- Less mature checkpointing and state persistence
- Harder to integrate with custom MCP tool registry
- Lower community adoption and fewer production references

**Reason rejected:** CrewAI's higher-level abstraction sacrifices the fine-grained control we need for reliable, production-grade agents. LangGraph's explicit state machine model is more auditable and debuggable.

### Alternative 3: AutoGen (Microsoft)

**Description:** Use Microsoft AutoGen for multi-agent conversations.

**Pros:**

- Strong multi-agent conversation model
- Microsoft backing (strategic alignment)

**Cons:**

- Conversation-centric model is less flexible than LangGraph's graph model
- Harder to integrate with external tools and MCP
- Less suitable for non-conversational agent workflows (document processing pipelines)
- LangGraph has broader community adoption and LangSmith integration

**Reason rejected:** AutoGen's conversation-centric abstraction is a poor fit for document processing and workflow automation agents that are not primarily conversational.

### Alternative 4: Direct LLM SDK Integration (No Framework)

**Description:** Call OpenAI/Anthropic SDKs directly without a framework layer.

**Pros:**

- Maximum control
- No framework abstraction overhead
- Simpler debugging

**Cons:**

- Implementing memory, tool calling, streaming, provider failover, RAG, and state management from scratch is months of work
- Not maintainable at our scale — each new capability requires custom implementation
- LangChain/LangGraph solve exactly these problems with battle-tested implementations

**Reason rejected:** The engineering cost of re-implementing what LangChain and LangGraph already provide correctly is not justified. We adopt the frameworks for their solutions to solved problems while maintaining an abstraction layer that allows future migration.

### Alternative 5: Node.js AI SDK (Vercel AI SDK)

**Description:** Implement the AI Kernel in Node.js using the Vercel AI SDK, keeping the entire backend in one language.

**Pros:**

- Single language across backend
- Strong TypeScript typing
- Unified deployment

**Cons:**

- Python ML ecosystem is dramatically more mature
- LlamaIndex, LlamaParse, RAGAS, Hugging Face transformers — Python-native, no equivalent in Node.js
- LangGraph has no production-ready JavaScript port
- Local model inference, fine-tuning pipelines — Python-only

**Reason rejected:** The Python ML ecosystem advantage is decisive. Maintaining a Python AI platform alongside a Node.js backend is a solved operational challenge. The capabilities we get from the Python ecosystem cannot be replicated in Node.js.

---

## Consequences

### Positive

- LangGraph enables complex, reliable stateful agents with proper checkpointing
- Provider abstraction enables multi-provider failover and cost optimization
- FastAPI + asyncio provides excellent streaming performance
- LlamaIndex + LlamaParse provides enterprise-grade document extraction
- RAGAS evaluation provides measurable AI quality guarantees

### Negative

- **Two languages in the backend** — Node.js services and Python AI platform require engineers to context-switch
- **Framework coupling** — LangChain and LangGraph have breaking changes between major versions
- **Python operational overhead** — separate deployment pipeline, different dependency management (`pyproject.toml` vs `package.json`)
- **Framework abstraction leaks** — LangChain/LangGraph abstractions sometimes obscure underlying behavior during debugging

### Mitigations

- Framework versions pinned in `pyproject.toml`; upgrades require evaluation re-run
- All LLM calls wrapped in a `BaseLLMProvider` abstraction for future migration flexibility
- LangSmith integration for full trace visibility into agent execution
- Comprehensive unit and integration tests for all kernel components

### Risks

| Risk                                 | Likelihood | Mitigation                                                          |
| ------------------------------------ | ---------- | ------------------------------------------------------------------- |
| LangGraph major breaking change      | Low        | Pin versions, abstraction layer, keep CHANGELOG                     |
| AI provider price increase           | Medium     | Multi-provider fallback, cost monitoring, GitHub Models as fallback |
| RAGAS quality regression in CI       | Low        | Golden dataset maintained alongside codebase                        |
| Python AI service becomes bottleneck | Low        | Horizontal scaling, async execution                                 |

---

## Related Decisions

- [ADR-002: AI Kernel + LangGraph + FastMCP](./ADR-002-ai-kernel-langgraph-fastmcp.md)
- [ADR-0006: Agent Runtime Architecture](./0006-agent-runtime.md)
- [AI Kernel Architecture](../ai-kernel.md)
- [MCP Architecture](../mcp.md)
