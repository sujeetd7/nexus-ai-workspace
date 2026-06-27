# Context Compression Hooks

Hooks that reduce the size of the prompt context before model execution.

## Purpose

Context compression hooks reduce token consumption by compressing conversation
history, deduplicating context, and applying sliding window strategies — while
preserving the semantic meaning required for high-quality responses.

## Hooks in This Folder

| Hook                      | Priority | Description                                         |
|---------------------------|----------|-----------------------------------------------------|
| `ContextCompressionHook`  | 30       | Semantic dedup + sliding window compression         |

## Compression Strategies

1. **Sliding Window** — Keep only the N most recent turns
2. **Semantic Deduplication** — Remove near-duplicate context using embeddings
3. **Hierarchical Summarization** — Compress old turns into summary sentences
4. **Importance Scoring** — Retain only highest-signal context chunks
5. **Chunking** — Split and score document chunks; keep top-K

## TODO

- [ ] `SummarizationCompressionHook` — LLM-based history summarization
- [ ] `EmbeddingDeduplicationHook` — Vector similarity dedup
- [ ] `DocumentChunkingHook` — Smart RAG context compression
