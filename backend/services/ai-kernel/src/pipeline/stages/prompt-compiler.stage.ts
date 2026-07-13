import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class PromptCompilerStage implements IPipelineStage {
  public readonly name = "PromptCompilerStage";

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Compiling prompt...`);

    const sections: string[] = [];

    sections.push("You are Nexus AI Workspace Assistant.");

    if (payload.memory?.conversationHistory?.length) {
      sections.push("");

      sections.push("Conversation History:");

      for (const message of payload.memory.conversationHistory) {
        sections.push(`${message.role}: ${message.content}`);
      }
    }

    if (payload.retrievedDocuments && payload.retrievedDocuments.length) {
      sections.push("");

      sections.push("Retrieved Context:");

      payload.retrievedDocuments.forEach((doc, index) => {
        sections.push(`[Document ${index + 1}]`);

        sections.push(doc.content);
      });
    }

    sections.push("");

    sections.push("User Request:");

    sections.push(payload.request.prompt);

    return {
      ...payload,

      compiledPrompt: sections.join("\n"),
    };
  }
}
