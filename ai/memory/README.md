# AI Memory System

Enterprise-grade multi-tier memory architecture for AI agents and conversational systems.

## Memory Taxonomy

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI MEMORY SYSTEM                          │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Short-Term  │  │  Long-Term   │  │      Episodic         │  │
│  │   (Working)  │  │ (Persistent) │  │   (Event Memory)      │  │
│  │   Redis      │  │   MongoDB    │  │   MongoDB + Vector    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Semantic Memory                            │   │
│  │             ChromaDB / Pinecone / Weaviate                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Memory Types Explained

### Short-Term Memory (Working Memory)
- **Scope**: Current session / conversation window
- **Duration**: Minutes to hours (TTL-based)
- **Storage**: Redis (in-memory, fast)
- **Content**: Active conversation turns, current task state, tool outputs
- **Access Pattern**: Read/write every turn
- **Analogy**: Human working memory — what you're thinking about right now

### Long-Term Memory (Persistent Memory)
- **Scope**: Across all sessions for a user/agent
- **Duration**: Indefinite (until explicitly cleared)
- **Storage**: MongoDB (persistent, queryable)
- **Content**: User preferences, learned facts, agent knowledge base
- **Access Pattern**: Read at session start, write periodically
- **Analogy**: Human long-term memory — accumulated knowledge over time

### Episodic Memory (Event Memory)
- **Scope**: Specific past events and interactions
- **Duration**: Configurable retention policy
- **Storage**: MongoDB + Vector index
- **Content**: Significant past conversations, decisions, outcomes
- **Access Pattern**: Retrieval via similarity search or timeline query
- **Analogy**: Human episodic memory — "I remember when we discussed X"

### Semantic Memory (Knowledge Memory)
- **Scope**: Domain knowledge and factual information
- **Duration**: Persistent until updated
- **Storage**: ChromaDB / Pinecone / Weaviate (vector database)
- **Content**: Embedded documents, facts, procedures, domain knowledge
- **Access Pattern**: Semantic similarity search (RAG)
- **Analogy**: Human semantic memory — general world knowledge

## Folder Structure

```
memory/
├── short-term/    ← Conversation window, session state (Redis)
├── long-term/     ← Persistent user/agent facts (MongoDB)
├── episodic/      ← Past event retrieval (MongoDB + Vector)
├── semantic/      ← Knowledge base, RAG context (ChromaDB)
├── stores/        ← Storage backend adapters (Redis, MongoDB, ChromaDB)
├── buffer/        ← Ring buffer for streaming memory
├── entity/        ← Entity extraction and tracking
├── manager/       ← Memory manager orchestrator
├── summary/       ← Conversation summarization
├── vector/        ← Vector similarity search
└── schemas/       ← Shared data schemas
```

## Interfaces

| Interface           | Description                                       |
|---------------------|---------------------------------------------------|
| `MemoryProvider`    | Base interface for all memory backends            |
| `ConversationMemory`| Short-term session memory interface               |
| `EpisodicMemory`    | Past-event retrieval interface                    |
| `SemanticMemory`    | Vector-based knowledge retrieval interface        |
| `MemoryStore`       | Low-level storage adapter interface               |

## TODO

- [ ] Implement memory consolidation: short-term → long-term transition
- [ ] Add memory decay and importance scoring
- [ ] Add cross-session memory linking
- [ ] Implement GDPR-compliant memory deletion
- [ ] Add memory compression via summarization
