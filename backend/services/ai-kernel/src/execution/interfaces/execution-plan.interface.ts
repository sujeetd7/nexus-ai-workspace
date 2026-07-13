import { ExecutionStep } from "./execution-step.interface";

export interface ExecutionPlan {
  provider: string;

  model: string;

  temperature: number;

  stream: boolean;

  maxTokens: number;

  steps: ExecutionStep[];
}
