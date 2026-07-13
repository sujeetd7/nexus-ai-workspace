import { ExecutionContext } from "./execution-context.interface";

export class ExecutionEngine {
  async execute(context: ExecutionContext): Promise<any> {
    let payload = context.payload;

    for (const step of context.plan.steps) {
      if (!step.enabled) {
        continue;
      }

      console.log(`Executing ${step.type}`);

      switch (step.type) {
        case "memory":
          break;

        case "rag":
          break;

        case "tool":
          break;

        case "llm":
          break;

        case "agent":
          break;

        case "output":
          break;
      }
    }

    return payload;
  }
}
