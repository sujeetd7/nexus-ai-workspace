import { ExecutionModule } from "../execution/execution.module";
import { AgentIntegrationModule } from "../integrations/agent/agent-integration.module";
import { AIServiceIntegrationModule } from "../integrations/ai-service/ai-service-integration.module";
import { ChatIntegrationModule } from "../integrations/chat/chat-integration.module";
import { DocumentIntegrationModule } from "../integrations/document/document-integration.module";
import { PromptIntegrationModule } from "../integrations/prompt/prompt-integration.module";
import { WorkspaceIntegrationModule } from "../integrations/workspace/workspace-integration.module";
import { MemoryModule } from "../memory/memory.module";
import { PipelineModule } from "../pipeline/pipeline.module";
import { ProviderModule } from "../providers/provider.module";
import { KernelBuilder } from "./kernel-builder";
import { IKernel } from "./kernel.interface";

let kernel: IKernel | null = null;

export async function getKernel(): Promise<IKernel> {
  if (kernel) {
    return kernel;
  }

  const agentServiceUrl =
    process.env.AGENT_SERVICE_URL ||
    (process.env.AGENT_SERVICE_PORT
      ? `http://localhost:${process.env.AGENT_SERVICE_PORT}`
      : undefined);
  const chatServiceUrl =
    process.env.CHAT_SERVICE_URL ||
    (process.env.CHAT_SERVICE_PORT
      ? `http://localhost:${process.env.CHAT_SERVICE_PORT}`
      : "http://localhost:3009");
  const documentServiceUrl =
    process.env.DOCUMENT_SERVICE_URL ||
    (process.env.DOCUMENT_SERVICE_PORT
      ? `http://localhost:${process.env.DOCUMENT_SERVICE_PORT}`
      : undefined);

  const workspaceServiceUrl =
    process.env.WORKSPACE_SERVICE_URL ?? "http://localhost:3002";

  const workspaceServiceKey =
    process.env.WORKSPACE_SERVICE_KEY;

  const workspaceServiceTimeout =
    Number(process.env.WORKSPACE_SERVICE_TIMEOUT ?? 60000);

  const aiServiceUrl =
    process.env.AI_SERVICE_URL ?? "http://localhost:3005";

  const aiServiceKey =
    process.env.AI_SERVICE_KEY;

  const aiServiceTimeout =
    Number(process.env.AI_SERVICE_TIMEOUT ?? 30000);

  kernel = new KernelBuilder()
    .addModule(new PipelineModule())
    .addModule(new MemoryModule())
    .addModule(new AIServiceIntegrationModule({
      url: aiServiceUrl,
      apiKey: aiServiceKey,
      timeoutMs: aiServiceTimeout,
    }))
    .addModule(new ProviderModule())
    .addModule(new PromptIntegrationModule())
    .addModule(new AgentIntegrationModule({ url: agentServiceUrl }))
    .addModule(new ChatIntegrationModule({ url: chatServiceUrl }))
    .addModule(new DocumentIntegrationModule({ url: documentServiceUrl }))
    .addModule(new WorkspaceIntegrationModule({
      url: workspaceServiceUrl,
      apiKey: workspaceServiceKey,
      timeoutMs: workspaceServiceTimeout,
    }))
    .addModule(new ExecutionModule())
    .build();

  await kernel.start();

  return kernel;
}
