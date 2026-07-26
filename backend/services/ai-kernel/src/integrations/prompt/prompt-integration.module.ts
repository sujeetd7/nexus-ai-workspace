import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import PromptServiceClient from "./prompt-service.client";

export class PromptIntegrationModule implements IKernelModule {
  public readonly name = "PromptIntegrationModule";

  private client?: PromptServiceClient;

  constructor(private baseUrl?: string) {}

  public async init(kernel: IKernel): Promise<void> {
    this.client = new PromptServiceClient(this.baseUrl);
    // Optionally, perform a health check here
    const healthy = await this.client.health();
    if (!healthy) {
      console.warn("PromptService appears unhealthy during init");
    }
  }

  public async dispose(): Promise<void> {}

  public getClient(): PromptServiceClient {
    if (!this.client) throw new Error("PromptServiceClient not initialized");
    return this.client;
  }
}
