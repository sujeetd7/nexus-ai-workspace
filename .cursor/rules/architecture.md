# Nexus AI Workspace Architecture

This repository is an enterprise AI platform.

Architecture:

Frontend

- React
- React Native

Backend

- NodeJS
- Express
- TypeScript
- PostgreSQL
- Redis
- MongoDB
- ChromaDB

Architecture Style

Microservices

Services

api-gateway
auth-service
workspace-service
user-service
document-service
prompt-service
chat-service
agent-service
ai-service
ai-kernel
analytics-service
notification-service
admin-service

AI Kernel responsibilities

- Execution Pipeline
- Planning
- Context Management
- Memory
- Tool Calling
- Prompt Compilation
- Provider Selection
- RAG
- Agent Runtime

The kernel MUST NEVER duplicate business logic that already exists inside another service.

Always reuse services through Integration Modules.

Current integrations

PromptIntegrationModule
DocumentIntegrationModule
AIServiceIntegrationModule

Future integrations

WorkspaceIntegrationModule
UserIntegrationModule
ChatIntegrationModule
AgentIntegrationModule

Never bypass integration modules.
