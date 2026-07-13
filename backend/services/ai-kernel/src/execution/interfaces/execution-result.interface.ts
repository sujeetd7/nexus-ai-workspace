import { ExecutionStatus } from "../runtime/execution-state";

export interface ExecutionResult {
  status: ExecutionStatus;

  output: any;

  latency: number;

  tokens: number;

  cost: number;

  error?: Error;
}
