# AI Kernel Architecture

> **Version:** 1.0.0 | **Status:** Living Document | **Audience:** AI/ML Engineers, Platform Engineers

---

## Purpose

This document defines the architecture of the Nexus AI Kernel — the Python-based AI platform that powers all intelligent capabilities of the workspace. It covers the LangChain/LangGraph execution layer, RAG pipeline, inference routing, provider abstraction, and the kernel's integration with the broader system.

---

## Table of Contents

1. [Kernel Overview](#1-kernel-overview)
2. [Directory Structure](#2-directory-structure)
3. [Core Kernel Components](#3-core-kernel-components)
4. [LangGraph Agent Runtime](#4-langgraph-agent-runtime)
5. [RAG Pipeline](#5-rag-pipeline)
6. [Inference Service](#6-inference-service)
7. [Provider Abstraction](#7-provider-abstraction)
8. [Memory Architecture](#8-memory-architecture)
9. [Tool Registry](#9-tool-registry)
10. [AI Service APIs](#10-ai-service-apis)
11. [Evaluation & Quality](#11-evaluation--quality)
12. [Fine-Tuning Pipeline](#12-fine-tuning-pipeline)
13. [Observability](#13-observability)
14. [Architectural Tradeoffs](#14-architectural-tradeoffs)
15. [Future Improvements](#15-future-improvements)

---

## 1. Kernel Overview

The AI Kernel is an independent Python/FastAPI layer responsible for:

- **Agent orchestration** — LangGraph stateful multi-agent execution
- **RAG (Retrieval-Augmented Generation)** — Document ingestion, chunking, embedding, and retrieval
- **Inference routing** — Provider-agnostic LLM call dispatch with fallback
- **Memory management** — Conversation history, working memory, long-term memory
- **Tool integration** — MCP tool calls, function calling, code execution

```
ai/
├── kernel/
│   ├── core/
│   │   ├── agents/             # LangGraph agent definitions
│   │   ├── chains/             # LangChain chain compositions
│   │   ├── graphs/             # LangGraph state machine graphs
│   │   ├── memory/             # Memory implementations
│   │   └── tools/              # Tool definitions and wrappers
│   ├── providers/
│   │   ├── openai/             # OpenAI provider adapter
│   │   ├── anthropic/          # Anthropic provider adapter
│   │   └── github-models/      # GitHub Models provider adapter
│   └── config/                 # Kernel configuration
├── services/
│   ├── agent-service/          # FastAPI: agent execution endpoint
│   ├── rag-service/            # FastAPI: RAG query and indexing
│   ├── inference-service/      # FastAPI: direct LLM inference
│   └── document-ai/            # FastAPI: document parsing + enrichment
├── pipelines/
│   ├── ingestion/              # Document ingestion pipeline
│   ├── evaluation/             # AI quality evaluation pipeline
│   ├── fine-tuning/            # Model fine-tuning utilities
│   └── training/               # Training data preparation
├── vectordb/
│   ├── chromadb/               # ChromaDB client, collections config
│   └── migrations/             # Vector store migrations
└── tests/
    ├── unit/                   # Unit tests per component
    ├── integration/            # End-to-end kernel tests
    ├── benchmarks/             # Latency and quality benchmarks
    └── fixtures/               # Test data and mock responses
```

---

## 2. Directory Structure

See above. Each sub-service under `ai/services/` is a standalone FastAPI application with its own `pyproject.toml`, Dockerfile, and test suite.

---

## 3. Core Kernel Components

### Chains (`kernel/core/chains/`)

LangChain chains for deterministic, non-stateful pipelines:

| Chain | Purpose |
|---|---|
| `ChatChain` | Single-turn chat with system prompt |
| `RAGChain` | Retrieve context + synthesize answer |
| `SummarizationChain` | Document summarization (map-reduce) |
| `ClassificationChain` | Intent and topic classification |
| `ExtractionChain` | Structured JSON extraction from text |

### Graphs (`kernel/core/graphs/`)

LangGraph stateful graphs for multi-step workflows:

| Graph | Purpose |
|---|---|
| `ChatAgentGraph` | Multi-turn conversational agent |
| `DocumentAgentGraph` | Document research and Q&A agent |
| `CodeAgentGraph` | Code generation, review, explanation |
| `WorkspaceAgentGraph` | Cross-workspace context synthesis |
| `ResearchAgentGraph` | Multi-step web and doc research |

---

## 4. LangGraph Agent Runtime

### State Machine Design

Each LangGraph agent is defined as a typed `StateGraph` with:

- **State** — Typed dataclass/TypedDict of conversation state
- **Nodes** — Python functions that transform state
- **Edges** — Conditional routing logic between nodes
- **Checkpointer** — Persistent state via Redis or PostgreSQL

### Agent Execution Lifecycle

```
Client Request
     │
     ▼
Agent Service (FastAPI)
     │  Deserialize + validate request
     ▼
LangGraph Graph.invoke() / .astream()
     │
     ├── Node: parse_input
     ├── Node: retrieve_context (RAG)
     ├── Node: plan (ReAct/ToT)
     ├── Node: execute_tools (MCP calls)
     │       └── Tool calls → MCP Registry
     ├── Node: synthesize_response
     └── Node: update_memory
     │
     ▼
Stream tokens → SSE response → API Gateway → Client
```

### Persistence and Checkpointing

- Short-term: Redis checkpointer for active sessions
- Long-term: PostgreSQL for persisted conversation graphs
- Checkpoint includes: state, message history, tool call history

---

## 5. RAG Pipeline

### Document Ingestion Pipeline

```
Document Upload
     │
     ▼
LlamaParse (extract clean text + structure)
     │
     ▼
Chunking Strategy (semantic / fixed-size / recursive)
     │
     ▼
Embedding (OpenAI text-embedding-3-small or -large)
     │
     ▼
ChromaDB upsert (with metadata: doc_id, chunk_index, source, timestamp)
     │
     ▼
MongoDB metadata update (document indexed status)
```

### Query Pipeline

```
User Query
     │
     ▼
Query Embedding (same model as ingestion)
     │
     ▼
ChromaDB similarity search (top-k = 5, threshold configurable)
     │
     ▼
Context Ranking + Reranking (Cohere Rerank or cross-encoder, future)
     │
     ▼
Prompt Construction (query + ranked context + system prompt)
     │
     ▼
LLM Synthesis
     │
     ▼
Response + Source Citations
```

### Chunking Strategies

| Strategy | Use Case | Chunk Size |
|---|---|---|
| Fixed-size | General purpose | 512 tokens, 50 overlap |
| Semantic | Coherent paragraph preservation | Variable, ~256–1024 |
| Recursive character | Code and markdown | 1000 chars, 200 overlap |
| Sentence | High-precision QA | ~3–5 sentences |

### LlamaIndex Integration

- `LlamaIndex` used for index management, query engines, and data connectors
- `LlamaParse` for high-fidelity extraction of PDFs, Word docs, presentations
- Index stored in ChromaDB collection, metadata in MongoDB

---

## 6. Inference Service

### Responsibilities

- Accepts raw prompt + model parameters from internal services
- Routes to appropriate provider based on model selection and availability
- Manages streaming SSE responses
- Applies prompt safety filtering (input and output)
- Records inference metrics (latency, token count, cost estimate)

### Model Routing

| Priority | Model | Provider | Use Case |
|---|---|---|---|
| Primary | GPT-4o | OpenAI | Complex reasoning, chat |
| Primary | GPT-4o-mini | OpenAI | Fast responses, classification |
| Fallback | Claude 3.5 Sonnet | Anthropic | Primary unavailable |
| Fallback | Llama 3.3 70B | GitHub Models | Cost optimization |
| Specialized | o3-mini | OpenAI | Deep reasoning tasks |
| Specialized | Codestral | GitHub Models | Code generation |

### Provider Failover

```
Request → Primary Provider
        → Success → Return response
        → Failure (rate limit / error) → Log → Retry secondary
        → Secondary available → Return response
        → All failed → Queue for retry → Return error to client
```

---

## 7. Provider Abstraction

All providers implement a common `BaseLLMProvider` interface:

```python
# Placeholder interface — do not implement yet
class BaseLLMProvider:
    async def complete(self, messages, model, **kwargs) -> CompletionResponse: ...
    async def stream(self, messages, model, **kwargs) -> AsyncIterator[str]: ...
    async def embed(self, texts: list[str]) -> list[list[float]]: ...
    def get_token_count(self, text: str) -> int: ...
    def get_available_models(self) -> list[ModelInfo]: ...
```

### Provider Configuration

| Provider | Authentication | Config Location |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | Environment variable |
| Anthropic | `ANTHROPIC_API_KEY` | Environment variable |
| GitHub Models | `GITHUB_TOKEN` | Environment variable |

---

## 8. Memory Architecture

### Memory Types

| Type | Scope | Storage | Purpose |
|---|---|---|---|
| **Buffer Memory** | Single session | In-process | Recent message history |
| **Summary Memory** | Session | Redis | Compressed past context |
| **Entity Memory** | Session | Redis | Extracted named entities |
| **Vector Memory** | Long-term | ChromaDB | Semantic memory search |
| **Episodic Memory** | Long-term | PostgreSQL | Past interaction records |

### Memory Lifecycle

- Buffer memory trimmed at context window limit (rolling last N messages)
- Summary generated when buffer exceeds threshold
- Entity extraction on each turn for workspace-relevant entities
- Long-term memory written asynchronously, read at session start

---

## 9. Tool Registry

### Built-in Tools

| Tool | Category | Description |
|---|---|---|
| `web_search` | Research | DuckDuckGo / Bing search |
| `document_retrieval` | RAG | Query ChromaDB for relevant chunks |
| `code_executor` | Code | Sandboxed Python/JS execution |
| `calculator` | Math | Symbolic + numeric computation |
| `datetime` | Utility | Current date/time, timezone conversion |
| `url_reader` | Research | Fetch and parse web page content |

### MCP Tools

All MCP servers in `mcp/servers/` register their tools in the kernel's tool registry at startup. See [MCP Architecture](./mcp.md) for details.

### Tool Safety

- Tools executed in sandboxed environments where applicable
- Tool outputs sanitized before inclusion in LLM context
- Tool usage audited in structured logs
- [TODO: implement tool execution rate limits per user]

---

## 10. AI Service APIs

### Agent Service: `POST /agents/invoke`

```
Input:  { agent_id, session_id, user_id, message, context }
Output: { response, sources, tool_calls, metadata }
        or SSE stream of tokens
```

### RAG Service: `POST /rag/query`

```
Input:  { query, workspace_id, top_k, threshold }
Output: { answer, sources: [{ doc_id, chunk, score }], metadata }
```

### RAG Service: `POST /rag/ingest`

```
Input:  { document_id, document_url, metadata }
Output: { job_id, status: "queued" }
```

### Inference Service: `POST /inference/complete`

```
Input:  { messages, model, temperature, max_tokens, stream }
Output: { content, usage, model_used } or SSE stream
```

---

## 11. Evaluation & Quality

### Evaluation Metrics

| Metric | Tool | Frequency |
|---|---|---|
| RAG Faithfulness | RAGAS | Per deployment |
| RAG Relevancy | RAGAS | Per deployment |
| Answer Correctness | Custom + LLM judge | Per deployment |
| Latency (TTFB) | Prometheus | Continuous |
| Token efficiency | Custom | Continuous |
| Tool call accuracy | Custom benchmark | Per deployment |

### Evaluation Pipeline (`pipelines/evaluation/`)

- Golden dataset of test queries with expected answers
- Automated RAGAS evaluation on RAG service changes
- LLM-as-judge for open-ended generation quality
- Regression testing against previous model versions

---

## 12. Fine-Tuning Pipeline

> **Status:** Planned for Phase 2

- Training data collection from anonymized, consented interactions
- Fine-tuning via OpenAI fine-tuning API or local with `unsloth`
- Evaluation before deployment (held-out test set)
- A/B testing framework for new vs. base model
- Model registry for versioning fine-tuned models

---

## 13. Observability

| Signal | Implementation | Status |
|---|---|---|
| LLM trace logging | LangSmith integration | [TODO: configure] |
| Inference latency | Prometheus histogram | [TODO: implement] |
| Token usage per user | Custom metric | [TODO: implement] |
| RAG retrieval quality | RAGAS dashboard | [TODO: implement] |
| Error rates | Prometheus counter | [TODO: implement] |
| Prompt/response audit | Structured log | [TODO: implement] |

---

## 14. Architectural Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| LangGraph over CrewAI | Fine-grained control, stateful | Steeper learning curve |
| Python for AI layer | ML ecosystem access | Separate language from backend |
| ChromaDB over Pinecone | Free, local development | Scaling limits at large volume |
| LlamaIndex + LangChain | Best of both indexing + chaining | Abstraction overlap |
| Single inference service | Centralized routing, fallback | Bottleneck risk at high load |

---

## 15. Future Improvements

- [ ] Add Cohere Rerank for improved RAG retrieval precision
- [ ] Implement multi-modal support (vision models, image generation)
- [ ] Build fine-tuning pipeline with domain adaptation
- [ ] Add agentic web browsing capability
- [ ] Implement memory distillation for long-running agents
- [ ] Evaluate GraphRAG for organizational knowledge graphs
- [ ] Add RLHF feedback loop from user reactions
- [ ] Support local inference with Ollama for air-gapped deployments
