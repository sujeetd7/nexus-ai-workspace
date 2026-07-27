import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import { AIServiceClient } from "./ai-service.client";
import { AIServiceClientOptions } from "./ai-service.interface";

export class AIServiceIntegrationModule implements IKernelModule {
  public readonly name = "AIServiceIntegrationModule";

  private client?: AIServiceClient;

  constructor(private opts?: Partial<AIServiceClientOptions>) {}

  public async init(kernel: IKernel): Promise<void> {
    const baseUrl = process.env.AI_SERVICE_URL || this.opts?.url;
    if (!baseUrl) {
      console.warn(
        "AI_SERVICE_URL not set; AIServiceIntegrationModule disabled",
      );
      return;
    }

    this.client = new AIServiceClient({
      url: baseUrl,
      apiKey: process.env.AI_SERVICE_KEY,
      timeoutMs: Number(process.env.AI_SERVICE_TIMEOUT) || this.opts?.timeoutMs,
    });

    // Test health to verify connection
    try {
      const health = await this.client.health();
      if (!health) {
        console.warn("AIService appears unhealthy during init");
      }
    } catch (error) {
      console.warn("Failed to check AIService health during init:", error);
    }
  }

  public async dispose(): Promise<void> {}

  public getClient(): AIServiceClient {
    if (!this.client) throw new Error("AIServiceClient not initialized");
    return this.client;
  }
}
