"""
Context Compression Hook — Python Implementation

Reduces token consumption by compressing conversation history and context
before the prompt is sent to the model.

Strategies:
1. Sliding Window     — Keep only the N most recent turns
2. Semantic Dedup     — Remove near-duplicate context (via embeddings)
3. Summary Injection  — Replace old turns with an LLM-generated summary
4. Importance Scoring — Drop low-importance turns by heuristic score

This hook implements Strategy Pattern: the compression strategy is
configurable and swappable without modifying the hook.

TODO: Implement semantic dedup with embedding similarity
TODO: Implement LLM-based summarization strategy
TODO: Add token counting via tiktoken
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, replace
from typing import Optional

from ..interfaces.prompt_hook_interface import (
    HookExecutionResult,
    HookStage,
    PromptContext,
    PromptHook,
)


# ---------------------------------------------------------------------------
# Compression Strategy Interface
# ---------------------------------------------------------------------------


class CompressionStrategy(abc.ABC):
    """Abstract compression strategy. Implementations are swappable."""

    @abc.abstractmethod
    async def compress(self, context: PromptContext) -> PromptContext:
        """Apply compression and return a new (smaller) PromptContext."""
        ...


# ---------------------------------------------------------------------------
# Sliding Window Strategy
# ---------------------------------------------------------------------------


class SlidingWindowStrategy(CompressionStrategy):
    """
    Keeps only the N most recent conversation turns.

    Simple but effective for most use cases. Loses long-range context.
    """

    def __init__(self, window_size: int = 10) -> None:
        self.window_size = window_size

    async def compress(self, context: PromptContext) -> PromptContext:
        if len(context.history) <= self.window_size:
            return context

        trimmed = context.history[-self.window_size :]
        return replace(context, history=tuple(trimmed))


# ---------------------------------------------------------------------------
# Placeholder Semantic Dedup Strategy
# ---------------------------------------------------------------------------


class SemanticDeduplicationStrategy(CompressionStrategy):
    """
    Removes near-duplicate history turns using embedding similarity.

    TODO: Implement with sentence-transformers or an embedding API
    TODO: Configure similarity threshold
    TODO: Cache embeddings for performance
    """

    def __init__(self, similarity_threshold: float = 0.92) -> None:
        self.similarity_threshold = similarity_threshold

    async def compress(self, context: PromptContext) -> PromptContext:
        # TODO: Compute embeddings for all turns
        # TODO: Build similarity matrix
        # TODO: Remove turns above similarity_threshold from older entries
        # Placeholder: return context unchanged
        return context


# ---------------------------------------------------------------------------
# Context Compression Hook
# ---------------------------------------------------------------------------


@dataclass
class ContextCompressionConfig:
    """Configuration for the ContextCompressionHook."""

    strategy: str = "sliding_window"  # "sliding_window" | "semantic_dedup" | "summary"
    sliding_window_size: int = 10
    semantic_similarity_threshold: float = 0.92


class ContextCompressionHook(PromptHook):
    """
    Context Compression Hook

    Applies a configurable compression strategy to the prompt context
    to reduce token usage before model execution.

    Attributes:
        name:     "ContextCompressionHook"
        stage:    HookStage.COMPRESSION
        priority: 30
    """

    name = "ContextCompressionHook"
    stage = HookStage.COMPRESSION
    priority = 30
    description = "Reduces token usage via configurable context compression"
    enabled = True

    def __init__(self) -> None:
        self._strategy: Optional[CompressionStrategy] = None
        self._config = ContextCompressionConfig()

    async def initialize(self, config: dict) -> None:
        cfg = ContextCompressionConfig(**config)
        self._config = cfg
        self._strategy = self._build_strategy(cfg)

    def _build_strategy(self, config: ContextCompressionConfig) -> CompressionStrategy:
        if config.strategy == "semantic_dedup":
            return SemanticDeduplicationStrategy(config.semantic_similarity_threshold)
        # Default: sliding window
        return SlidingWindowStrategy(config.sliding_window_size)

    async def execute(self, context: PromptContext) -> HookExecutionResult:
        if self._strategy is None:
            self._strategy = SlidingWindowStrategy(self._config.sliding_window_size)

        original_turns = len(context.history)
        compressed = await self._strategy.compress(context)
        final_turns = len(compressed.history)

        mutated = original_turns != final_turns

        return HookExecutionResult(
            proceed=True,
            mutated_context=compressed if mutated else None,
            diagnostics={
                "strategy": self._config.strategy,
                "original_turns": original_turns,
                "compressed_turns": final_turns,
                "turns_removed": original_turns - final_turns,
            },
        )

    async def health_check(self) -> bool:
        return True
