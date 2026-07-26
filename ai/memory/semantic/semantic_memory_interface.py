"""
Semantic Memory Interface — Python

Vector-based knowledge retrieval for Retrieval-Augmented Generation (RAG).

Backed by ChromaDB locally, with adapters for Pinecone and Weaviate.

Design:
  - Repository Pattern: SemanticMemory is a domain interface; adapters implement storage.
  - Embedding is abstracted: any embedding model can be plugged in.
  - Filter support: metadata filtering alongside vector similarity.

TODO: Implement ChromaDBSemanticMemory adapter in stores/
TODO: Implement PineconeSemanticMemory adapter
TODO: Add hybrid BM25 + vector search support
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------


@dataclass
class KnowledgeDocument:
    """
    A piece of knowledge stored in semantic memory.

    Documents are chunked before embedding. This represents a single chunk.
    """

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None           # e.g., file path, URL, document title
    document_id: Optional[str] = None      # Stable ID for updates/deletes
    chunk_index: Optional[int] = None      # Position within parent document
    created_at: Optional[datetime] = None
    embedding: Optional[list[float]] = None  # Pre-computed embedding (optional)


@dataclass
class SearchResult:
    """Result from a semantic similarity search."""

    document_id: str
    content: str
    metadata: dict[str, Any]
    similarity_score: float       # 0.0 – 1.0 (higher = more similar)
    source: Optional[str] = None


# ---------------------------------------------------------------------------
# Semantic Memory Interface
# ---------------------------------------------------------------------------


class SemanticMemory(abc.ABC):
    """
    Abstract interface for vector-based semantic memory.

    Implementations provide vector storage and similarity search.
    All methods are async to support remote vector databases.
    """

    @abc.abstractmethod
    async def store(self, document: KnowledgeDocument) -> str:
        """
        Store a knowledge document and return its ID.

        If the document has a document_id, it will be upserted.
        The implementation is responsible for computing embeddings if not provided.

        Returns:
            The stored document's ID.
        """
        ...

    @abc.abstractmethod
    async def store_batch(self, documents: list[KnowledgeDocument]) -> list[str]:
        """
        Batch store multiple documents.
        More efficient than individual store() calls for large ingestion.
        """
        ...

    @abc.abstractmethod
    async def search(
        self,
        query: str,
        top_k: int = 5,
        filter: Optional[dict[str, Any]] = None,
        min_score: float = 0.0,
    ) -> list[SearchResult]:
        """
        Semantic similarity search.

        Args:
            query:     Natural language query to embed and search.
            top_k:     Number of results to return.
            filter:    Optional metadata filter (e.g., {"source": "docs"}).
            min_score: Minimum similarity score threshold (0.0–1.0).

        Returns:
            List of SearchResult ordered by descending similarity.
        """
        ...

    @abc.abstractmethod
    async def delete(self, document_id: str) -> bool:
        """
        Delete a document from semantic memory by ID.

        Returns:
            True if deleted, False if not found.
        """
        ...

    @abc.abstractmethod
    async def update(
        self, document_id: str, document: KnowledgeDocument
    ) -> bool:
        """Update an existing document (re-embeds content)."""
        ...

    @abc.abstractmethod
    async def count(self, filter: Optional[dict[str, Any]] = None) -> int:
        """Return the total number of stored documents (optionally filtered)."""
        ...

    @abc.abstractmethod
    async def health_check(self) -> bool:
        """Verify the vector store backend is reachable."""
        ...
