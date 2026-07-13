export interface ExecutionStep {
  id: string;
  name: string;
  type: "llm" | "tool" | "rag" | "memory";

  enabled: boolean;

  metadata?: Record<string, unknown>;
}

export interface ExecutionPlan {
  provider: string;

  model: string;

  temperature: number;

  stream: boolean;

  requiresMemory: boolean;

  requiresTools: boolean;

  requiresRAG: boolean;

  maxTokens?: number;

  steps: ExecutionStep[];
}
