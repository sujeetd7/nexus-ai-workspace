# Long-Term Memory (Persistent Memory)

Cross-session persistent memory backed by MongoDB.

## Concept

Long-term memory persists **beyond individual sessions**. It stores facts,
preferences, and knowledge that the agent or user has accumulated over time.

### Characteristics

| Property    | Value                                   |
|-------------|-----------------------------------------|
| Backend     | MongoDB                                 |
| TTL         | None (manual deletion / retention policy) |
| Scope       | User-level or Agent-level               |
| Capacity    | Unlimited (managed by retention policy) |
| Access      | Read at session start, write on update  |

### What is stored

- User preferences and communication style
- Learned domain facts and corrections
- Agent-accumulated knowledge base
- Task completion history and outcomes
- User-approved persistent facts ("Remember that I prefer Python 3.12")

## Interface: `PersistentMemory`

```typescript
interface PersistentMemory {
  userId: string;
  store(key: string, value: MemoryEntry): Promise<void>;
  retrieve(key: string): Promise<MemoryEntry | null>;
  search(query: string, limit?: number): Promise<MemoryEntry[]>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}
```

## Retention Policy

Entries are tagged with:
- `importance`: 0.0–1.0 (higher = longer retention)
- `source`: "user" | "agent" | "system"
- `expiresAt`: Optional absolute expiry

## TODO

- [ ] Implement MongoDB adapter
- [ ] Add importance-based memory pruning
- [ ] Add memory versioning (update history)
- [ ] Implement GDPR right-to-erasure compliance
- [ ] Add cross-user anonymized knowledge sharing (opt-in)
