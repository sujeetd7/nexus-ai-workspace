import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

export class RagExecutor implements IExecutionExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[RAGExecutor]");

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput({
        documents: context.payload.retrievedDocuments ?? [],
      })
      .setLatencyMs(1)
      .setFinishReason("completed")
      .build();
  }
}
