# ADR-002: AI Kernel Architecture – LangGraph + FastMCP

## Status
Accepted

## Date
2024-01-20

## Context
The platform requires stateful, multi-agent AI workflows that can be composed,
debugged, and extended by multiple teams. We also need a standardised tool
protocol that works across LLM providers.

## Decision
Adopt LangGraph for stateful agent graphs and FastMCP for tool/resource exposure
via the Model Context Protocol. Each AI service exposes its capabilities as an
MCP server; the AI kernel orchestrates them via LangGraph nodes.

## Consequences
- Consistent tool interface regardless of LLM provider
- LangGraph enables human-in-the-loop and checkpointing out-of-the-box
- Teams must learn MCP server development patterns
- FastMCP simplifies server boilerplate significantly

## Alternatives Considered
- LangChain agents without LangGraph: lacks stateful transitions
- Custom tool protocol: rejected – MCP is becoming industry standard
