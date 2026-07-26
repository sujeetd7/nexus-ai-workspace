import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

export class OutputExecutor implements IExecutionExecutor {
  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[OutputExecutor]");

    const output = context.payload.lastOutput;

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput(output)
      .setLatencyMs(1)
      .setFinishReason("completed")
      .build();
  }
}
