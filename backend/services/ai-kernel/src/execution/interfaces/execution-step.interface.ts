export type ExecutionStepType =
  "memory" | "planner" | "rag" | "tool" | "llm" | "plugin" | "hook" | "output";

export interface ExecutionStep {
  id: string;

  name: string;

  type: ExecutionStepType;

  enabled: boolean;

  retryable?: boolean;

  timeout?: number;

  parallel?: boolean;

  metadata?: Record<string, any>;
}
