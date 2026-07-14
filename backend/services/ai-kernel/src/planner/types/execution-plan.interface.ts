import type { ExecutionStep } from "../../execution/interfaces/execution-step.interface";

export type ExecutionPriority = "low" | "normal" | "high" | "critical";

export type ExecutionStatus =
  "pending" | "running" | "completed" | "failed" | "skipped";

export interface ExecutionPlan {
  id: string;

  action?: string;

  details?: {
    parallelSteps?: ExecutionPlan[];
    [key: string]: unknown;
  };

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

export type { ExecutionStep };
