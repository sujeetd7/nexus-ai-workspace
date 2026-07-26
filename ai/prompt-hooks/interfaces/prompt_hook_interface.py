"""
Prompt Hook System — Core Python Interfaces (Abstract Base Classes)

Architecture: Chain of Responsibility + Strategy Pattern

Pipeline Flow:
  User Prompt → PreProcess → Compression → Security → Model → PostProcess

All hooks are stateless. PromptContext is treated as immutable (frozen dataclass).
Hooks receive a context, perform their concern, and return a HookExecutionResult.

Usage:
    class MyHook(PromptHook):
        async def execute(self, context: PromptContext) -> HookExecutionResult:
            # TODO: implement hook logic
            return HookExecutionResult(proceed=True)
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class HookStage(str, Enum):
    """Pipeline execution stage for a hook."""

    PREPROCESS = "preprocess"
    COMPRESSION = "compression"
    SECURITY = "security"
    POSTPROCESS = "postprocess"


class ConversationRole(str, Enum):
    """Valid roles in a conversation turn."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


# ---------------------------------------------------------------------------
# Supporting Data Classes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ConversationTurn:
    """Immutable representation of a single conversation turn."""

    role: ConversationRole
    content: str
    timestamp: datetime
    token_count: Optional[int] = None


@dataclass(frozen=True)
class ToolDefinition:
    """Represents an injected tool/function definition."""

    name: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class PromptMetadata:
    """Execution metadata propagated through the full pipeline."""

    session_id: str
    model_id: str
    started_at: datetime
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    tags: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class HookTraceEntry:
    """Audit trace entry for a single hook execution."""

    hook_name: str
    stage: HookStage
    duration_ms: float
    mutated: bool
    skipped: bool
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Core Data Models
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PromptContext:
    """
    Immutable snapshot of the prompt state at a given pipeline stage.

    Hooks MUST NOT mutate this object. Use dataclasses.replace() to
    produce a modified copy, then wrap it in HookExecutionResult.
    """

    execution_id: str
    original_prompt: str
    current_prompt: str
    metadata: PromptMetadata
    history: tuple[ConversationTurn, ...] = field(default_factory=tuple)
    tools: tuple[ToolDefinition, ...] = field(default_factory=tuple)
    system_instructions: Optional[str] = None
    hook_trace: tuple[HookTraceEntry, ...] = field(default_factory=tuple)
    # Arbitrary extension data for hook-to-hook communication
    extensions: dict[str, Any] = field(default_factory=dict)


@dataclass
class HookExecutionResult:
    """
    Result produced by a single hook execution.

    A hook may:
    - Allow execution to continue (proceed=True)
    - Block execution (proceed=False, with block_reason)
    - Return a mutated context (mutated_context)
    """

    proceed: bool
    mutated_context: Optional[PromptContext] = None
    block_reason: Optional[str] = None
    error: Optional[Exception] = None
    diagnostics: dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptResult:
    """Final result of the complete prompt pipeline execution."""

    success: bool
    hook_trace: list[HookTraceEntry]
    total_duration_ms: float
    executed_at: datetime
    final_context: Optional[PromptContext] = None
    model_response: Optional[str] = None
    blocked_by: Optional[str] = None
    block_reason: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None


# ---------------------------------------------------------------------------
# Abstract Hook Interface
# ---------------------------------------------------------------------------


class PromptHook(abc.ABC):
    """
    Abstract base class for all Prompt Hooks.

    Implementations MUST be stateless. All state is passed through PromptContext.
    Hooks should be idempotent where possible.

    Attributes:
        name:        Unique identifier for this hook (used in trace + registry).
        stage:       Pipeline stage this hook belongs to.
        priority:    Execution priority within a stage (lower = earlier).
        description: Human-readable description of this hook's purpose.
        enabled:     Whether this hook is active.
    """

    name: str
    stage: HookStage
    priority: int = 100
    description: str = ""
    enabled: bool = True

    @abc.abstractmethod
    async def execute(self, context: PromptContext) -> HookExecutionResult:
        """
        Execute the hook against the given context.

        Must be non-blocking for most hooks. Only security hooks may
        set proceed=False to halt the pipeline.

        Args:
            context: Immutable current prompt context.

        Returns:
            HookExecutionResult with proceed flag and optional mutated context.
        """
        ...

    async def initialize(self, config: dict[str, Any]) -> None:
        """
        Optional initialization with configuration.
        Called once during pipeline setup.

        TODO: Override in hooks that require external connections (Redis, DB, etc.)
        """

    async def health_check(self) -> bool:
        """
        Optional health check.
        Used by monitoring and readiness probes.

        Returns:
            True if the hook is healthy and operational.
        """
        return True


# ---------------------------------------------------------------------------
# Pipeline Interface
# ---------------------------------------------------------------------------


class PromptPipeline(abc.ABC):
    """
    Abstract orchestrator for prompt hook execution.
    Follows the Chain of Responsibility pattern.
    """

    @abc.abstractmethod
    def register(self, hook: PromptHook) -> None:
        """Register a hook into the pipeline."""
        ...

    @abc.abstractmethod
    async def execute_stage(
        self, stage: HookStage, context: PromptContext
    ) -> HookExecutionResult:
        """Execute all registered hooks for a given stage."""
        ...

    @abc.abstractmethod
    async def execute(self, context: PromptContext) -> PromptResult:
        """Execute the full pipeline across all stages."""
        ...
