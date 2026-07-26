import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

export class MemoryExecutor implements IExecutionExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[MemoryExecutor]");

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput({
        memoryLoaded: true,
        conversation: context.payload.memory,
      })
      .setLatencyMs(1)
      .setFinishReason("completed")
      .build();
  }
}
