export type ExecutionPriority = "low" | "normal" | "high" | "critical";

export type ExecutionStatus =
  "pending" | "running" | "completed" | "failed" | "skipped";

export interface ExecutionPlan {
  id: string;

  provider: string;

  model: string;

  temperature: number;

  stream: boolean;

  maxTokens: number;

  requiresMemory: boolean;

  requiresTools: boolean;

  requiresRAG: boolean;

  requiresAgent: boolean;

  priority: ExecutionPriority;

  createdAt: Date;

  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;

  name: string;

  type: "memory" | "rag" | "tool" | "llm" | "agent" | "output";

  enabled: boolean;

  status: ExecutionStatus;

  dependsOn: string[];

  metadata?: Record<string, any>;
}
