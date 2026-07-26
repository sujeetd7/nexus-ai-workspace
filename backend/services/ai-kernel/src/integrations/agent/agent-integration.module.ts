import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import {
  AgentServiceClient,
  AgentServiceClientOptions,
} from "./agent-service.client";

export class AgentIntegrationModule implements IKernelModule {
  public readonly name = "AgentIntegrationModule";

  private client?: AgentServiceClient;

  constructor(private opts?: Partial<AgentServiceClientOptions>) {}

  public async init(kernel: IKernel): Promise<void> {
    const baseUrl = process.env.AGENT_SERVICE_URL || this.opts?.url;
    if (!baseUrl) {
      console.warn(
        "AGENT_SERVICE_URL not set; AgentIntegrationModule disabled",
      );
      return;
    }

    this.client = new AgentServiceClient({
      url: baseUrl,
      apiKey: process.env.AGENT_SERVICE_KEY,
      timeoutMs:
        Number(process.env.AGENT_SERVICE_TIMEOUT) || this.opts?.timeoutMs,
      retries: this.opts?.retries ?? 3,
    });

    const healthy = await this.client.health();
    if (!healthy) console.warn("AgentService appears unhealthy during init");
  }

  public async dispose(): Promise<void> {}

  public getClient(): AgentServiceClient {
    if (!this.client) throw new Error("AgentServiceClient not initialized");
    return this.client;
  }
}
