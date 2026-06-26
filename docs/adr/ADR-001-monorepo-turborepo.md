# ADR-001: Monorepo with Turborepo + pnpm Workspaces

## Status
Accepted

## Date
2024-01-15

## Context
The Nexus AI Workspace combines frontend, backend, AI services, and MCP servers.
We need a unified repository strategy that enables code sharing, atomic commits,
and coordinated releases across all layers of the platform.

## Decision
Use a pnpm workspace monorepo managed by Turborepo for task orchestration.
Each logical domain (frontend, backend, ai, mcp, shared) lives in a top-level
folder with internal packages published under the @nexus scope.

## Consequences
- Single git history; simplified cross-service refactoring
- Turborepo caches build artifacts; faster CI
- All teams must use pnpm >=9 and Node >=20
- Large clone size; mitigated by sparse checkouts in CI

## Alternatives Considered
- Polyrepo: rejected – too much overhead for shared types and contracts
- Nx: considered – Turborepo chosen for simpler configuration
