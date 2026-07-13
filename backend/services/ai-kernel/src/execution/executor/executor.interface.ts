import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";

export interface IExecutor {
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}
