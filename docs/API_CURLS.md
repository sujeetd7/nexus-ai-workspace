# API cURL Reference

Status table: [`API_STATUS.md`](./API_STATUS.md) · Maintenance guide: [`API_MAINTENANCE.md`](./API_MAINTENANCE.md)

Generated from registered Express routes in:

- `backend/services/ai-service`
- `backend/services/prompt-service`
- `backend/services/document-service`
- `backend/services/ai-kernel`
- `backend/services/agent-service`

Default ports are taken from each service `server.ts` (`process.env.PORT` fallback).

| Service | Base URL (default) |
|---------|-------------------|
| AI-Service | `http://localhost:3007` |
| Prompt-Service | `http://localhost:3005` |
| Document-Service | `http://localhost:3004` |
| AI-Kernel | `http://localhost:3004` |
| Agent-Service | `http://localhost:3008` |

> **Note:** Document-Service and AI-Kernel both default to port `3004` in code. Set `PORT` when running both locally.

Unless a route reads auth middleware (none found on these routes), headers are:

```http
Content-Type: application/json
```

---

## AI-Service

Mount prefix: `/api/v1` (`backend/services/ai-service/src/app.ts`)

### Health

**Method:** `GET`  
**URL:** `http://localhost:3007/api/v1/health`  
**Headers:** _(none required)_  
**Query:** `provider` (optional; defaults to `ollama` in controller)  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3007/api/v1/health?provider=ollama"
```

---

### Provider Health

**Method:** `GET`  
**URL:** `http://localhost:3007/api/v1/provider-health`  
**Headers:** _(none required)_  
**Query:** `provider` (optional; defaults to `ollama` in controller)  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3007/api/v1/provider-health?provider=ollama"
```

---

### Execute

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/execute`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`ExecuteAIDto`; `prompt` required by controller):

```json
{
  "workspaceId": "workspace-1",
  "userId": "user-1",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "prompt": "Hello"
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/execute" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","userId":"user-1","provider":"ollama","model":"qwen2.5-coder:1.5b","prompt":"Hello"}'
```

---

### Stream

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/stream`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (cast as `ExecuteAIDto` in controller):

```json
{
  "workspaceId": "workspace-1",
  "userId": "user-1",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "prompt": "Hello"
}
```

```bash
curl -N -X POST "http://localhost:3007/api/v1/stream" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","userId":"user-1","provider":"ollama","model":"qwen2.5-coder:1.5b","prompt":"Hello"}'
```

---

### Embed

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/embed`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`EmbedAIDto`; `provider` required by controller):

```json
{
  "provider": "ollama",
  "model": "nomic-embed-text",
  "input": ["text A", "text B"]
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/embed" \
  -H "Content-Type: application/json" \
  -d '{"provider":"ollama","model":"nomic-embed-text","input":["text A","text B"]}'
```

---

### Vector Upsert

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/vector/upsert`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`UpsertVectorDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "id": "vector-1",
  "text": "hello vector",
  "metadata": { "source": "manual" }
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/vector/upsert" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","id":"vector-1","text":"hello vector","metadata":{"source":"manual"}}'
```

---

### Vector Upsert Batch

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/vector/upsert-batch`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`IndexBatchDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "documentId": "doc-1",
  "title": "My Doc",
  "chunks": ["chunk one", "chunk two"],
  "metadata": { "tag": "demo" }
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/vector/upsert-batch" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","documentId":"doc-1","title":"My Doc","chunks":["chunk one","chunk two"],"metadata":{"tag":"demo"}}'
```

---

### Vector Search

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/vector/search`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`SearchVectorDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "query": "hello",
  "limit": 5
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/vector/search" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","query":"hello","limit":5}'
```

---

### RAG Query

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/rag/query`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`RagQueryDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "question": "What is in the index?",
  "topK": 5,
  "metadata": { "tag": "demo" }
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/rag/query" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"qwen2.5-coder:1.5b","question":"What is in the index?","topK":5,"metadata":{"tag":"demo"}}'
```

---

### Document Index

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/documents/index`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`IndexDocumentDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "documentId": "doc-1",
  "title": "My Doc",
  "content": "Document text to index.",
  "type": "text",
  "metadata": { "tag": "demo" }
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/documents/index" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","documentId":"doc-1","title":"My Doc","content":"Document text to index.","type":"text","metadata":{"tag":"demo"}}'
```

---

### Document Reindex

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/documents/reindex`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`IndexDocumentDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "documentId": "doc-1",
  "title": "My Doc",
  "content": "Updated document text.",
  "type": "text"
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/documents/reindex" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","documentId":"doc-1","title":"My Doc","content":"Updated document text.","type":"text"}'
```

---

### Document Delete (vector index)

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/documents/delete`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`DeleteDocumentDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text",
  "documentId": "doc-1"
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/documents/delete" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text","documentId":"doc-1"}'
```

---

### Document Index Stats

**Method:** `POST`  
**URL:** `http://localhost:3007/api/v1/documents/stats`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`IndexStatsDto`):

```json
{
  "workspaceId": "workspace-1",
  "provider": "ollama",
  "model": "nomic-embed-text"
}
```

```bash
curl -X POST "http://localhost:3007/api/v1/documents/stats" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","provider":"ollama","model":"nomic-embed-text"}'
```

---

## Prompt-Service

Mount prefix: `/api/v1` (`backend/services/prompt-service/src/app.ts`)

### Create Prompt

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`CreatePromptDto`):

```json
{
  "workspaceId": "workspace-1",
  "createdBy": "user-1",
  "name": "assistant.default",
  "description": "Default assistant prompt",
  "category": "general",
  "isPublic": false
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","createdBy":"user-1","name":"assistant.default","description":"Default assistant prompt","category":"general","isPublic":false}'
```

---

### Create Prompt Version

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/version`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`CreatePromptVersionDto`):

```json
{
  "promptId": "prompt-id-1",
  "version": 1,
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "{{question}}",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "temperature": 0.2
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/version" \
  -H "Content-Type: application/json" \
  -d '{"promptId":"prompt-id-1","version":1,"systemPrompt":"You are a helpful assistant.","userPrompt":"{{question}}","provider":"ollama","model":"qwen2.5-coder:1.5b","temperature":0.2}'
```

---

### Execute Prompt (record execution)

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/execute`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (fields read in `PromptService.execute`):

```json
{
  "promptVersionId": "version-id-1",
  "input": { "question": "Explain RAG" }
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/execute" \
  -H "Content-Type: application/json" \
  -d '{"promptVersionId":"version-id-1","input":{"question":"Explain RAG"}}'
```

---

### Execute Published Prompt

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/execute-published`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`ExecutePromptDto`):

```json
{
  "promptId": "prompt-id-1",
  "variables": { "question": "Explain RAG" }
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/execute-published" \
  -H "Content-Type: application/json" \
  -d '{"promptId":"prompt-id-1","variables":{"question":"Explain RAG"}}'
```

---

### List Prompts

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts`  
**Headers:** _(none required)_  
**Query** (`PromptQueryFilters` in service): `search`, `category`, `tag`, `favorite`, `shared`  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts?search=assistant&category=general"
```

---

### Prompt Analytics

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts/analytics`  
**Headers:** _(none required)_  
**Query:** `promptId` (optional)  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts/analytics?promptId=prompt-id-1"
```

---

### Get Prompt

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts/prompt-id-1"
```

---

### Delete Prompt

**Method:** `DELETE`  
**URL:** `http://localhost:3005/api/v1/prompts/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3005/api/v1/prompts/prompt-id-1"
```

---

### Publish Prompt Version

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/version/{versionId}/publish`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/version/version-id-1/publish"
```

---

### Rollback Prompt

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/rollback`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`RollbackPromptDto`):

```json
{
  "promptId": "prompt-id-1",
  "version": 1
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/rollback" \
  -H "Content-Type: application/json" \
  -d '{"promptId":"prompt-id-1","version":1}'
```

---

### Execution History (all)

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts/executions"
```

---

### Execution History (by prompt)

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts/{promptId}/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts/prompt-id-1/executions"
```

---

### Execution Details

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/prompts/execution/{executionId}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/prompts/execution/execution-id-1"
```

---

### Playground

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/playground`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`PlaygroundPromptDto`):

```json
{
  "versionId": "version-id-1",
  "variables": { "question": "Explain RAG" }
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/playground" \
  -H "Content-Type: application/json" \
  -d '{"versionId":"version-id-1","variables":{"question":"Explain RAG"}}'
```

---

### Compare Prompt Versions

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/prompts/compare`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`ComparePromptVersionDto`):

```json
{
  "promptId": "prompt-id-1",
  "sourceVersion": 1,
  "targetVersion": 2
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/prompts/compare" \
  -H "Content-Type: application/json" \
  -d '{"promptId":"prompt-id-1","sourceVersion":1,"targetVersion":2}'
```

---

### Run Evaluation

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/evaluations/run`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`RunEvaluationDto`):

```json
{
  "promptVersionId": "version-id-1",
  "datasetName": "demo-dataset",
  "evaluator": "exact-match",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "systemPrompt": "You are a helpful assistant.",
  "userPrompt": "{{question}}",
  "cases": [
    {
      "id": "case-1",
      "variables": { "question": "What is RAG?" },
      "expected": "retrieval augmented generation"
    }
  ]
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/evaluations/run" \
  -H "Content-Type: application/json" \
  -d '{"promptVersionId":"version-id-1","datasetName":"demo-dataset","evaluator":"exact-match","provider":"ollama","model":"qwen2.5-coder:1.5b","systemPrompt":"You are a helpful assistant.","userPrompt":"{{question}}","cases":[{"id":"case-1","variables":{"question":"What is RAG?"},"expected":"retrieval augmented generation"}]}'
```

---

### Evaluation History

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/evaluations`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/evaluations"
```

---

### Evaluation Details

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/evaluations/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/evaluations/evaluation-id-1"
```

---

### Create Dataset

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/datasets`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (fields read in `DatasetController.create`):

```json
{
  "name": "demo-dataset",
  "description": "Sample cases",
  "cases": [
    {
      "id": "case-1",
      "variables": { "question": "What is RAG?" },
      "expected": "retrieval augmented generation"
    }
  ]
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/datasets" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-dataset","description":"Sample cases","cases":[{"id":"case-1","variables":{"question":"What is RAG?"},"expected":"retrieval augmented generation"}]}'
```

---

### List Datasets

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/datasets`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/datasets"
```

---

### Get Dataset

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/datasets/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/datasets/dataset-id-1"
```

---

### Update Dataset

**Method:** `PUT`  
**URL:** `http://localhost:3005/api/v1/datasets/{id}`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (partial update; `DatasetController.update` passes `req.body` to service):

```json
{
  "name": "demo-dataset-renamed",
  "description": "Updated description"
}
```

```bash
curl -X PUT "http://localhost:3005/api/v1/datasets/dataset-id-1" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-dataset-renamed","description":"Updated description"}'
```

---

### Delete Dataset

**Method:** `DELETE`  
**URL:** `http://localhost:3005/api/v1/datasets/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3005/api/v1/datasets/dataset-id-1"
```

---

### Add Dataset Case

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/datasets/{id}/cases`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`PromptDatasetCase`):

```json
{
  "id": "case-2",
  "variables": { "question": "What is an agent?" },
  "expected": "autonomous software entity"
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/datasets/dataset-id-1/cases" \
  -H "Content-Type: application/json" \
  -d '{"id":"case-2","variables":{"question":"What is an agent?"},"expected":"autonomous software entity"}'
```

---

### Remove Dataset Case

**Method:** `DELETE`  
**URL:** `http://localhost:3005/api/v1/datasets/{id}/cases/{caseId}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3005/api/v1/datasets/dataset-id-1/cases/case-2"
```

---

### Run Benchmark

**Method:** `POST`  
**URL:** `http://localhost:3005/api/v1/benchmarks`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`BenchmarkController.run` requires `dataset`; shape from `PromptDataset`):

```json
{
  "dataset": {
    "id": "dataset-1",
    "name": "demo-dataset",
    "description": "Sample cases",
    "cases": [
      {
        "id": "case-1",
        "variables": { "question": "What is RAG?" },
        "expected": { "question": "What is RAG?" }
      }
    ],
    "createdAt": "2026-07-15T00:00:00.000Z",
    "updatedAt": "2026-07-15T00:00:00.000Z"
  }
}
```

```bash
curl -X POST "http://localhost:3005/api/v1/benchmarks" \
  -H "Content-Type: application/json" \
  -d '{"dataset":{"id":"dataset-1","name":"demo-dataset","description":"Sample cases","cases":[{"id":"case-1","variables":{"question":"What is RAG?"},"expected":{"question":"What is RAG?"}}],"createdAt":"2026-07-15T00:00:00.000Z","updatedAt":"2026-07-15T00:00:00.000Z"}}'
```

---

### List Benchmarks

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/benchmarks`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/benchmarks"
```

---

### Get Benchmark

**Method:** `GET`  
**URL:** `http://localhost:3005/api/v1/benchmarks/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3005/api/v1/benchmarks/benchmark-id-1"
```

---

## Document-Service

Mount prefix: `/api/v1` (`backend/services/document-service/src/app.ts`)

### Create Document

**Method:** `POST`  
**URL:** `http://localhost:3004/api/v1/documents`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`CreateDocumentDto`):

```json
{
  "workspaceId": "workspace-1",
  "uploadedBy": "user-1",
  "filename": "notes.txt",
  "mimeType": "text/plain",
  "size": 128,
  "storagePath": "/storage/workspace-1/notes.txt",
  "status": "READY",
  "metadata": { "tag": "demo" }
}
```

```bash
curl -X POST "http://localhost:3004/api/v1/documents" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"workspace-1","uploadedBy":"user-1","filename":"notes.txt","mimeType":"text/plain","size":128,"storagePath":"/storage/workspace-1/notes.txt","status":"READY","metadata":{"tag":"demo"}}'
```

---

### List Documents

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/documents`  
**Headers:** _(none required)_  
**Query** (`ListDocumentsDto`): `workspaceId`, `status`, `search`, `skip`, `take`  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/documents?workspaceId=workspace-1&status=READY&skip=0&take=20"
```

---

### Get Document

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/documents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/documents/document-id-1"
```

---

### Update Document

**Method:** `PATCH`  
**URL:** `http://localhost:3004/api/v1/documents/{id}`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`UpdateDocumentDto`):

```json
{
  "filename": "notes-renamed.txt",
  "status": "ARCHIVED",
  "metadata": { "tag": "archived" }
}
```

```bash
curl -X PATCH "http://localhost:3004/api/v1/documents/document-id-1" \
  -H "Content-Type: application/json" \
  -d '{"filename":"notes-renamed.txt","status":"ARCHIVED","metadata":{"tag":"archived"}}'
```

---

### Delete Document

**Method:** `DELETE`  
**URL:** `http://localhost:3004/api/v1/documents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3004/api/v1/documents/document-id-1"
```

---

## Agent-Service

Mount prefix: `/api/v1` (`backend/services/agent-service/src/app.ts`)

### Health

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/"
```

---

### Create Agent

**Method:** `POST`  
**URL:** `http://localhost:3008/api/v1/agents`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`CreateAgentRequest`; `workspaceId`, `name`, `slug`, `provider`, `model` required by DTO — note the service always regenerates `slug` from `name` via `slugify`):

```json
{
  "workspaceId": "ws-1",
  "name": "Support Agent",
  "slug": "support-agent",
  "description": "Handles support queries",
  "systemPrompt": "You are a helpful assistant. Say hello to {{name}}.",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "temperature": 0.2,
  "maxTokens": 128
}
```

```bash
curl -X POST "http://localhost:3008/api/v1/agents" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-1","name":"Support Agent","slug":"support-agent","description":"Handles support queries","systemPrompt":"You are a helpful assistant. Say hello to {{name}}.","provider":"ollama","model":"qwen2.5-coder:1.5b","temperature":0.2,"maxTokens":128}'
```

---

### List Agents

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/agents`  
**Headers:** _(none required)_  
**Query:** `workspaceId` (optional; only param wired through the controller)  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/agents?workspaceId=ws-1"
```

---

### Get Agent

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/agents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/agents/agent-id-1"
```

---

### Update Agent

**Method:** `PUT`  
**URL:** `http://localhost:3008/api/v1/agents/{id}`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`UpdateAgentRequest`; all fields optional):

```json
{
  "temperature": 0.5,
  "maxTokens": 256
}
```

```bash
curl -X PUT "http://localhost:3008/api/v1/agents/agent-id-1" \
  -H "Content-Type: application/json" \
  -d '{"temperature":0.5,"maxTokens":256}'
```

---

### Delete Agent

**Method:** `DELETE`  
**URL:** `http://localhost:3008/api/v1/agents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3008/api/v1/agents/agent-id-1"
```

---

### Execute Agent

**Method:** `POST`  
**URL:** `http://localhost:3008/api/v1/agents/execute`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`agentId` required; `variables` interpolated into the agent's `systemPrompt`, e.g. `{{name}}`):

```json
{
  "agentId": "agent-id-1",
  "variables": {
    "name": "World"
  }
}
```

```bash
curl -X POST "http://localhost:3008/api/v1/agents/execute" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-id-1","variables":{"name":"World"}}'
```

Calls out to AI-Kernel (`AI_KERNEL_URL`, default `http://127.0.0.1:3010/api/v1`) and persists the result as an `AgentExecution` row.

---

### List Executions

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/agents/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/agents/executions"
```

---

### List Executions By Agent

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/agents/{agentId}/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/agents/agent-id-1/executions"
```

---

### Get Execution

**Method:** `GET`  
**URL:** `http://localhost:3008/api/v1/agents/execution/{executionId}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3008/api/v1/agents/execution/execution-id-1"
```

---

## AI-Kernel

Mount prefix: `/api/v1/kernel` (`backend/services/ai-kernel/src/app.ts`)

### Execute

**Method:** `POST`  
**URL:** `http://localhost:3004/api/v1/kernel/execute`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body** (`IKernelExecutionRequest`):

```json
{
  "prompt": "Hello from kernel",
  "workspaceId": "workspace-1",
  "userId": "user-1",
  "provider": "ollama",
  "model": "qwen2.5-coder:1.5b",
  "temperature": 0.2,
  "stream": false,
  "maxTokens": 128,
  "tools": [],
  "metadata": {}
}
```

```bash
curl -X POST "http://localhost:3004/api/v1/kernel/execute" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello from kernel","workspaceId":"workspace-1","userId":"user-1","provider":"ollama","model":"qwen2.5-coder:1.5b","temperature":0.2,"stream":false,"maxTokens":128,"tools":[],"metadata":{}}'
```

---

### List Prompts (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/prompts`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/prompts"
```

---

### Get Prompt (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/prompts/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/prompts/prompt-id-1"
```

---

### Get Prompt Versions (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/prompts/{id}/versions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/prompts/prompt-id-1/versions"
```

---

### List Documents (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/documents`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/documents"
```

---

### Agent Health (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/health`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/health"
```

---

### Create Agent (proxy)

**Method:** `POST`  
**URL:** `http://localhost:3004/api/v1/kernel/agents`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body:** same shape as Agent-Service's `Create Agent`.

```bash
curl -X POST "http://localhost:3004/api/v1/kernel/agents" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"ws-1","name":"Support Agent","slug":"support-agent","description":"Handles support queries","systemPrompt":"You are a helpful assistant. Say hello to {{name}}.","provider":"ollama","model":"qwen2.5-coder:1.5b","temperature":0.2,"maxTokens":128}'
```

---

### List Agents (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/agents`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/agents"
```

---

### Get Agent (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/agents/agent-id-1"
```

---

### Update Agent (proxy)

**Method:** `PUT`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/{id}`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body:** same shape as Agent-Service's `Update Agent`.

```bash
curl -X PUT "http://localhost:3004/api/v1/kernel/agents/agent-id-1" \
  -H "Content-Type: application/json" \
  -d '{"temperature":0.5,"maxTokens":256}'
```

---

### Delete Agent (proxy)

**Method:** `DELETE`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/{id}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl -X DELETE "http://localhost:3004/api/v1/kernel/agents/agent-id-1"
```

---

### Execute Agent (proxy)

**Method:** `POST`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/execute`  
**Headers:**

```http
Content-Type: application/json
```

**Sample Body:** same shape as Agent-Service's `Execute Agent`.

```bash
curl -X POST "http://localhost:3004/api/v1/kernel/agents/execute" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-id-1","variables":{"name":"World"}}'
```

Routes through AI-Kernel's `AgentIntegrationModule` to Agent-Service's own `/agents/execute` (`AGENT_SERVICE_URL`, default `http://127.0.0.1:3008`).

---

### List Executions (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/agents/executions"
```

---

### List Executions By Agent (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/{agentId}/executions`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/agents/agent-id-1/executions"
```

---

### Get Execution (proxy)

**Method:** `GET`  
**URL:** `http://localhost:3004/api/v1/kernel/agents/execution/{executionId}`  
**Headers:** _(none required)_  
**Sample Body:** _(none)_

```bash
curl "http://localhost:3004/api/v1/kernel/agents/execution/execution-id-1"
```
