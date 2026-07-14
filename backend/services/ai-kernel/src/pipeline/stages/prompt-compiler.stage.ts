import { PromptIntegrationModule } from "../../integrations/prompt/prompt-integration.module";
import { IKernelContext } from "../../kernel/kernel-context.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { IPipelineStage } from "../pipeline.interface";
import { PipelinePayload } from "../types/pipeline-payload.interface";

export class PromptCompilerStage implements IPipelineStage {
  public readonly name = "PromptCompilerStage";

  constructor(private kernel?: IKernel) {}

  public async execute(
    context: IKernelContext,
    payload: PipelinePayload,
  ): Promise<PipelinePayload> {
    console.log(`[${this.name}] Compiling prompt...`);

    // If a promptKey is provided, use Prompt Service to render the prompt
    const request = payload.request || {};

    if (request.promptKey && this.kernel) {
      try {
        const promptModule = this.kernel.getModule<PromptIntegrationModule>(
          "PromptIntegrationModule",
        );
        const client = promptModule.getClient();

        const rendered = await client.renderPrompt(
          request.promptKey,
          request.variables || {},
          {
            promptVersion: request.promptVersion,
            workspaceId: request.workspaceId || context.workspaceId,
          },
        );

        return {
          ...payload,
          compiledPrompt: rendered.rendered,
        };
      } catch (err: any) {
        // If prompt missing (404) fallback to raw prompt if provided
        if (err.name === "PromptNotFoundError" || err.status === 404) {
          if (request.prompt) {
            return { ...payload, compiledPrompt: request.prompt };
          }
          throw new Error(
            `Prompt key ${request.promptKey} not found and no raw prompt provided.`,
          );
        }

        throw err;
      }
    }

    // Default legacy behavior: build prompt locally from parts
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
