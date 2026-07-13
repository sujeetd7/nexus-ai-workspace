import { IExecutor } from "./executor.interface";

export class LLMExecutor implements IExecutor {
  supports(type: string): boolean {
    return type === "llm";
  }

  async execute(context: any): Promise<any> {
    console.log("Executing LLM");

    return context;
  }
}
