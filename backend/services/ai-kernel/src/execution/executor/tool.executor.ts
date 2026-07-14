import { ExecutionContext } from "../engine/execution-context";
import { ExecutionResult } from "../engine/execution-result";
import { IExecutionExecutor } from "./executor.interface";

import { ToolRegistry } from "../../tools/registry/tool-registry";
import { ToolExecutor as RuntimeToolExecutor } from "../../tools/runtime/tool-executor";

export class ToolExecutionExecutor implements IExecutionExecutor {
  constructor(private readonly registry: ToolRegistry) {}

  public async execute(context: ExecutionContext): Promise<ExecutionResult> {
    console.log("[ToolExecutionExecutor]");

    const runtime = new RuntimeToolExecutor(this.registry);

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
