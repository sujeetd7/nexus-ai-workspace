import { randomUUID } from "crypto";
import { ExecutionPlan, ExecutionStep } from "./types/execution-plan.interface";

export class PlannerService {
  build(request: any): ExecutionPlan {
    const steps: ExecutionStep[] = [];

    if (request.useMemory) {
      steps.push({
        id: randomUUID(),
        name: "Load Memory",
        type: "memory",
        enabled: true,
        status: "pending",
        dependsOn: [],
        metadata: {},
      });
    }

    if (request.useRAG) {
      steps.push({
        id: randomUUID(),
        name: "Retrieve Documents",
        type: "rag",
        enabled: true,
        status: "pending",
        dependsOn: [],
        metadata: {},
      });
    }

    if (request.tools?.length) {
      steps.push({
        id: randomUUID(),
        name: "Execute Tools",
        type: "tool",
        enabled: true,
        status: "pending",
        dependsOn: [],
        metadata: {
          tools: request.tools,
        },
      });
    }

    steps.push({
      id: randomUUID(),
      name: "Generate Response",
      type: "llm",
      enabled: true,
      status: "pending",
      dependsOn: [],
    });

    steps.push({
      id: randomUUID(),
      name: "Prepare Output",
      type: "output",
      enabled: true,
      status: "pending",
      dependsOn: [],
    });

    return {
      id: randomUUID(),

      action: "multi_step",

      details: {
        parallelSteps: [],
      },

      provider: request.provider,

      model: request.model,

      temperature: request.temperature,

      stream: request.stream,

      maxTokens: request.maxTokens,

      requiresMemory: request.useMemory,

      requiresTools: request.tools?.length > 0,

      requiresRAG: request.useRAG,

      requiresAgent: false,

      enableToolCalling: request.tools?.length > 0 || request.enableToolCalling,

      priority: "normal",

      createdAt: new Date(),

      steps,
    };
  }
}
