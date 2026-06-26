# Nexus AI Workspace

> Enterprise AI Platform — ChatGPT Enterprise · Microsoft Copilot · Notion AI · Slack AI · GitHub Copilot

A production-grade, monorepo-based Enterprise AI Platform built with React, Node.js, Python/FastAPI, LangGraph, MCP/FastMCP, RAG, and a full microservices backend.

---

## Architecture Overview

```
nexus-ai-workspace/
├── frontend/          # React (web) + React Native (mobile) + shared UI packages
├── backend/           # Node.js/Express microservices (auth, chat, workspace, docs, …)
├── ai/                # Python/FastAPI AI kernel (LangGraph, RAG, LlamaIndex, ChromaDB)
├── mcp/               # FastMCP servers (nexus-core, workspace, document, github, code)
├── shared/            # Cross-platform contracts, types, schemas, utilities
├── docs/              # ADRs, API docs, architecture diagrams, runbooks
└── infrastructure/    # Docker, Kubernetes, Terraform, monitoring, scripts
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, React Native, TypeScript, Redux Toolkit + RTK Query, React Hook Form, Zod, Tailwind CSS, Socket.io |
| **Backend** | Node.js 20, Express, TypeScript, Prisma, PostgreSQL 16, MongoDB 7, Redis 7, BullMQ, JWT + Refresh Tokens, RBAC |
| **AI Platform** | Python 3.12, FastAPI, LangChain, LangGraph, FastMCP, RAG, ChromaDB, LlamaIndex, LlamaParse, OpenAI, GitHub Models |
| **Infrastructure** | Docker, Docker Compose, Kubernetes, Terraform, GitHub Actions, Turborepo, pnpm |
| **Quality** | ESLint, Prettier, Husky, lint-staged, Commitlint, Jest, pytest, CodeQL |

## Quick Start

### Prerequisites

- Node.js >= 20, pnpm >= 9
- Python >= 3.12, uv
- Docker Desktop

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/your-org/nexus-ai-workspace
cd nexus-ai-workspace
pnpm install

# 2. Start infrastructure
docker compose up -d

# 3. Copy environment
cp .env.example .env

# 4. Run database migrations
pnpm db:migrate

# 5. Start all services
pnpm dev
```

## Documentation

- [Architecture Decision Records](docs/adr/)
- [Getting Started Guide](docs/guides/getting-started/)
- [API Reference](docs/api/)
- [Deployment Guide](docs/guides/deployment/)
- [Security Guide](docs/guides/security/)

## Contributing

See [CONTRIBUTING.md](docs/guides/development/) for commit conventions, branching strategy, and PR guidelines.

## License

Proprietary – All rights reserved.
