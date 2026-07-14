import { ExecutionModule } from "../execution/execution.module";
import { PromptIntegrationModule } from "../integrations/prompt/prompt-integration.module";
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

  kernel = new KernelBuilder()
    .addModule(new PipelineModule())
    .addModule(new MemoryModule())
    .addModule(new ProviderModule())
    .addModule(new PromptIntegrationModule())
    .addModule(new ExecutionModule())
    .build();

  await kernel.start();

  return kernel;
}
