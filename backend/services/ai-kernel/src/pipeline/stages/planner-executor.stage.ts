import { randomUUID } from "crypto";

import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { IPipelineStage } from "../pipeline.interface";
import { ExecutionPlan } from "../types/execution-plan.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class PlannerExecutorStage implements IPipelineStage {
  constructor(private readonly kernel?: IKernel) {}
  public readonly name = "PlannerExecutorStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Building execution plan...`);

    const request = payload.request ?? context.request;

    const provider =
      request?.provider ?? request?.metadata?.provider ?? "ollama";

    const model = request?.model ?? request?.metadata?.model ?? "llama3";

    const executionPlan: ExecutionPlan = {
      provider,

      model,

      temperature:
        request?.temperature ?? request?.metadata?.temperature ?? 0.2,

      stream: request?.stream ?? request?.metadata?.stream ?? false,

      requiresMemory: true,

      requiresTools: Array.isArray(request?.tools) && request.tools.length > 0,

      requiresRAG: (payload.retrievedDocuments?.length ?? 0) > 0,

      maxTokens: request?.maxTokens ?? request?.metadata?.maxTokens ?? 4096,

      steps: [
        {
          id: randomUUID(),
          name: "LLM Generation",
          type: "llm",
          enabled: true,
        },
      ],
    };

    console.log(`[${this.name}] Execution plan generated.`);

    return {
      ...payload,

      executionPlan,
    };
  }
}
