# Semantic Memory (Knowledge Memory)

Vector-based knowledge retrieval backed by ChromaDB.

## Concept

Semantic memory stores **domain knowledge** as vector embeddings, enabling
similarity-based retrieval (Retrieval-Augmented Generation / RAG).

### Characteristics

| Property | Value                                            |
| -------- | ------------------------------------------------ |
| Backend  | ChromaDB (local), Pinecone / Weaviate (cloud)    |
| TTL      | None (managed by knowledge base lifecycle)       |
| Scope    | Shared (tenant-scoped) or private (agent-scoped) |
| Capacity | Millions of vectors (depends on backend)         |
| Access   | Top-K similarity search (ANN)                    |

### What is stored

- Product documentation chunks
- Code examples and API references
- Policy documents and procedures
- FAQ and knowledge base articles
- Any text that the agent may need to reference

## Interface: `SemanticMemory`

```typescript
interface SemanticMemory {
  store(document: KnowledgeDocument): Promise<string>;
  search(
    query: string,
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]>;
  delete(documentId: string): Promise<void>;
  update(
    documentId: string,
    document: Partial<KnowledgeDocument>,
  ): Promise<void>;
}
```

## RAG Flow

```
User Query
    ↓
Embed Query (embedding model)
    ↓
Vector Similarity Search (ChromaDB top-K)
    ↓
Retrieved Chunks → Injected into Prompt Context
    ↓
Model Generates Response with Grounded Context
```

## Supported Backends

| Backend  | Type        | Notes                                  |
| -------- | ----------- | -------------------------------------- |
| ChromaDB | Local/Cloud | Self-hosted, great for dev             |
| Pinecone | Cloud SaaS  | Managed, high scale                    |
| Weaviate | Cloud/Local | Hybrid BM25 + vector search            |
| pgvector | PostgreSQL  | Vector extension for existing Postgres |

## TODO

- [ ] Implement ChromaDB adapter
- [ ] Add Pinecone adapter for cloud deployments
- [ ] Add hybrid BM25 + vector search (Weaviate)
- [ ] Implement document chunking pipeline
- [ ] Add embedding model abstraction layer
