# Memory Stores — Storage Backend Adapters

Low-level adapters connecting the memory interfaces to physical storage backends.

## Supported Backends

| Adapter               | Backend  | Memory Type           | Status  |
| --------------------- | -------- | --------------------- | ------- |
| `RedisMemoryStore`    | Redis    | Short-term (sessions) | Planned |
| `MongoDBMemoryStore`  | MongoDB  | Long-term + Episodic  | Planned |
| `ChromaDBMemoryStore` | ChromaDB | Semantic (vector)     | Planned |

## Architecture

```
Memory Interface (domain)
    ↓
Memory Store (adapter)
    ↓
Storage Backend (Redis / MongoDB / ChromaDB)
```

The `MemoryStore` interface provides a low-level key-value abstraction.
Higher-level memory types (ConversationMemory, SemanticMemory) compose stores.

## Interface: `MemoryStore`

```typescript
interface MemoryStore<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
  flush(pattern?: string): Promise<number>;
}
```

## TODO

- [ ] Implement `RedisMemoryStore`
- [ ] Implement `MongoDBMemoryStore`
- [ ] Implement `ChromaDBMemoryStore`
- [ ] Add connection pooling configuration
- [ ] Add retry/circuit-breaker middleware
- [ ] Add encryption at rest for sensitive memory content
