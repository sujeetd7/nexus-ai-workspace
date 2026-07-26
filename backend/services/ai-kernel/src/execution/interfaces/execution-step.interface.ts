export type ExecutionStepType =
  | "memory"
  | "planner"
  | "rag"
  | "tool"
  | "llm"
  | "agent"
  | "output"
  | "plugin"
  | "hook"
  | string;

export interface ExecutionStep {
  id: string;

  name: string;

  type: ExecutionStepType;

  enabled: boolean;

  status?: "pending" | "running" | "completed" | "failed" | "skipped";

  dependsOn?: string[];

  metadata?: Record<string, unknown>;

  executor?: string;

  retryable?: boolean;

  timeout?: number;

  parallel?: boolean;

  retry?: number;

  dependencies?: string[];

  config?: Record<string, unknown>;
}
