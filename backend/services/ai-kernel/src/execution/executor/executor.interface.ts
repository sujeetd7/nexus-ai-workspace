import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";

export interface IExecutionExecutor {
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}
