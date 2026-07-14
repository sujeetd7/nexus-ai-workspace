import { randomUUID } from "crypto";

import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { ExecutionPlan } from "../../planner/types/execution-plan.interface";
import { IPipelineStage } from "../pipeline.interface";
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

    const model =
      request?.model ??
      request?.metadata?.model ??
      process.env.OLLAMA_MODEL ??
      "llama3.2";

    const executionPlan: ExecutionPlan = {
      id: randomUUID(),

      action: "multi_step",

      details: {
        parallelSteps: [],
      },

      provider,

      model,

      temperature:
        request?.temperature ?? request?.metadata?.temperature ?? 0.2,

      stream: request?.stream ?? request?.metadata?.stream ?? false,

      requiresMemory: true,

      requiresTools: Array.isArray(request?.tools) && request.tools.length > 0,

      requiresRAG: (payload.retrievedDocuments?.length ?? 0) > 0,

      requiresAgent: false,

      priority: "normal",

      createdAt: new Date(),

      maxTokens: request?.maxTokens ?? request?.metadata?.maxTokens ?? 4096,

      steps: [
        {
          id: randomUUID(),
          name: "Load Memory",
          type: "memory",
          enabled: true,
          status: "pending",
          dependsOn: [],
          metadata: {},
        },

        {
          id: randomUUID(),
          name: "Execute Tools",
          type: "tool",
          enabled: true,
          status: "pending",
          dependsOn: [],
          metadata: {
            tools: request?.tools?.length > 0 ? request.tools : [],
          },
        },

        {
          id: randomUUID(),
          name: "LLM Generation",
          type: "llm",
          enabled: true,
          status: "pending",
          dependsOn: [],
          metadata: {},
        },

        {
          id: randomUUID(),
          name: "Prepare Output",
          type: "output",
          enabled: true,
          status: "pending",
          dependsOn: [],
          metadata: {},
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
