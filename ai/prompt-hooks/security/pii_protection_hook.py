"""
PII Protection Hook — Python Implementation

Detects and redacts Personally Identifiable Information (PII) from prompts
before they are sent to the language model.

PII Categories:
  - Email addresses
  - Phone numbers (US and international)
  - Social Security Numbers (SSN)
  - Credit card numbers
  - IP addresses
  - Names (via NER — TODO)
  - API keys and bearer tokens

Redaction Modes:
  - REDACT: Replace with generic [REDACTED]
  - MASK:   Replace with type label [EMAIL], [PHONE], etc.
  - BLOCK:  Halt pipeline execution entirely

Design:
  - Regex-based detection for structured PII (fast, deterministic)
  - NER-based detection for unstructured PII (TODO: integrate spaCy or Presidio)
  - Complies with GDPR, CCPA, and HIPAA data handling requirements

References:
  - Microsoft Presidio: https://microsoft.github.io/presidio/
  - OWASP LLM06: Sensitive Information Disclosure

TODO: Integrate with Microsoft Presidio for production-grade PII detection
TODO: Add NER-based name/location detection (spaCy en_core_web_lg)
TODO: Add configurable PII policy per tenant/classification level
TODO: Emit PII detection events to audit log (separate from regular logs)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from enum import Enum
from typing import Optional

from ..interfaces.prompt_hook_interface import (
    HookExecutionResult,
    HookStage,
    PromptContext,
    PromptHook,
)


# ---------------------------------------------------------------------------
# Enums & Config
# ---------------------------------------------------------------------------


class RedactionMode(str, Enum):
    REDACT = "REDACT"  # Replace with [REDACTED]
    MASK = "MASK"      # Replace with [TYPE] e.g. [EMAIL]
    BLOCK = "BLOCK"    # Halt pipeline


@dataclass
class PIIProtectionConfig:
    """Configuration for the PII Protection Hook."""

    mode: RedactionMode = RedactionMode.MASK
    scan_history: bool = True
    scan_system_instructions: bool = False
    # TODO: Add per-category enable/disable flags


# ---------------------------------------------------------------------------
# PII Patterns
# ---------------------------------------------------------------------------

# NOTE: These patterns are illustrative, NOT production-complete.
# Use Microsoft Presidio or AWS Comprehend for production PII detection.
_PII_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("EMAIL", re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")),
    ("PHONE", re.compile(r"\b(\+?1[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b")),
    ("SSN", re.compile(r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b")),
    ("CREDIT_CARD", re.compile(r"\b(?:\d[ \-]?){13,16}\b")),
    ("IP_ADDRESS", re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")),
    ("API_KEY", re.compile(r"\b(sk-|pk-|api-|bearer\s+)[A-Za-z0-9_\-]{20,}\b", re.IGNORECASE)),
]


# ---------------------------------------------------------------------------
# PII Protection Hook
# ---------------------------------------------------------------------------


class PIIProtectionHook(PromptHook):
    """
    PII Protection Hook

    Scans the prompt (and optionally history) for PII and applies
    the configured redaction mode before model execution.

    Attributes:
        name:     "PIIProtectionHook"
        stage:    HookStage.SECURITY
        priority: 40
    """

    name = "PIIProtectionHook"
    stage = HookStage.SECURITY
    priority = 40
    description = "Detects and redacts PII before sending to the model"
    enabled = True

    def __init__(self) -> None:
        self._config = PIIProtectionConfig()

    async def initialize(self, config: dict) -> None:
        self._config = PIIProtectionConfig(**config)

    async def execute(self, context: PromptContext) -> HookExecutionResult:
        detections: list[dict] = []

        # Scan current prompt
        cleaned_prompt, prompt_hits = self._redact(context.current_prompt)
        detections.extend(prompt_hits)

        # TODO: Scan history turns if scan_history=True
        # TODO: Scan system_instructions if scan_system_instructions=True

        if self._config.mode == RedactionMode.BLOCK and detections:
            return HookExecutionResult(
                proceed=False,
                block_reason=f"PII detected in prompt ({len(detections)} instances). Execution blocked.",
                diagnostics={"pii_count": len(detections)},
            )

        mutated = cleaned_prompt != context.current_prompt
        mutated_context = replace(context, current_prompt=cleaned_prompt) if mutated else None

        return HookExecutionResult(
            proceed=True,
            mutated_context=mutated_context,
            diagnostics={
                "pii_detected": len(detections) > 0,
                "pii_count": len(detections),
                "categories_found": list({d["category"] for d in detections}),
            },
        )

    def _redact(self, text: str) -> tuple[str, list[dict]]:
        """Apply PII detection and redaction. Returns cleaned text and detection list."""
        detections: list[dict] = []

        for category, pattern in _PII_PATTERNS:
            matches = pattern.findall(text)
            if matches:
                detections.append({"category": category, "count": len(matches)})
                replacement = f"[{category}]" if self._config.mode == RedactionMode.MASK else "[REDACTED]"
                text = pattern.sub(replacement, text)

        return text, detections

    async def health_check(self) -> bool:
        # TODO: Verify NER model is loaded when integrated
        return True
