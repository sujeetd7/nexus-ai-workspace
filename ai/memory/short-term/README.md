# Short-Term Memory (Working Memory)

In-session conversational memory backed by Redis.

## Concept

Short-term memory holds the **active context** for the current conversation session.
It is fast, ephemeral, and scoped to a single session.

### Characteristics

| Property | Value                           |
| -------- | ------------------------------- |
| Backend  | Redis                           |
| TTL      | Configurable (default: 2 hours) |
| Scope    | Single session                  |
| Capacity | Limited by token budget         |
| Access   | Read/write every turn           |

### What is stored

- Active conversation history (all turns in the current session)
- Current tool call state and pending results
- Working facts extracted in this session
- Agent scratchpad / chain-of-thought intermediate steps

## Interface: `ConversationMemory`

```typescript
interface ConversationMemory {
  sessionId: string;
  addTurn(turn: ConversationTurn): Promise<void>;
  getTurns(limit?: number): Promise<ConversationTurn[]>;
  clear(): Promise<void>;
  getTokenCount(): Promise<number>;
}
```

## TODO

- [ ] Implement Redis adapter for ConversationMemory
- [ ] Add automatic TTL extension on active sessions
- [ ] Add sliding window truncation when approaching token limit
- [ ] Add turn-level metadata (intent, entities, sentiment)
