import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

import { ToolRegistry } from "../../tools/registry/tool-registry";
import { EnhancedToolExecutor } from "../../tools/runtime/enhanced-tool-executor";

export class ToolExecutionExecutor implements IExecutionExecutor {
  constructor(private readonly registry: ToolRegistry) {}

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[ToolExecutionExecutor]");

    const runtime = new EnhancedToolExecutor(this.registry);

    const toolNames: string[] =
      context.payload.currentStep?.metadata?.tools ??
      context.payload.request?.tools ??
      [];

    const results = [];

    for (const toolName of toolNames) {
      const response = await runtime.execute({
        tool: toolName,
        input: context.payload.request,
        requestId: context.requestId,
        context: {
          workspaceId: context.payload.request?.workspaceId,
          userId: context.payload.request?.userId,
          traceId: context.traceId,
          sessionId: context.payload.request?.sessionId,
          metadata: {
            conversationId: context.payload.request?.conversationId,
            source: "execution_engine"
          }
        }
      });

      results.push(response);
    }

    return ExecutionResult.builder(context.requestId)
      .setSuccess(true)
      .setOutput(results)
      .setLatencyMs(0)
      .setFinishReason("completed")
      .build();
  }
}
