# Document Service API cURL Examples

Assumes `DOCUMENT_SERVICE_URL` at `http://localhost:3004` (set `DOCUMENT_SERVICE_PORT` or `DOCUMENT_SERVICE_URL` in ai-kernel `.env`).

- Health

```
curl -sS http://localhost:3006/health
```

- List documents

```
curl -sS "http://localhost:3006/api/v1/documents"
```

- Upload document (multipart)

```
curl -X POST http://localhost:3006/api/v1/documents \
  -F "file=@./example.pdf" \
  -F "metadata={\"title\":\"Example\"};type=application/json"
```

- Get document

```
curl -sS http://localhost:3006/api/v1/documents/{documentId}
```

- Delete document

```
curl -X DELETE http://localhost:3006/api/v1/documents/{documentId}
```

- Search

```
curl -sS -X POST http://localhost:3006/api/v1/documents/search \
  -H "Content-Type: application/json" \
  -d '{"query":"your query","topK":5}'
```

- Index document

```
curl -X POST http://localhost:3006/api/v1/documents/{documentId}/index
```

- Reindex all

```
curl -X POST http://localhost:3006/api/v1/documents/reindex
```

- Workspace documents

```
curl -sS "http://localhost:3006/api/v1/workspaces/{workspaceId}/documents"
```
