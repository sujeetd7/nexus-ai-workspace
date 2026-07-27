import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import {
  WorkspaceServiceClient,
  WorkspaceServiceClientOptions,
} from "./workspace-service.client";

export class WorkspaceIntegrationModule implements IKernelModule {
  public readonly name = "WorkspaceIntegrationModule";

  private client?: WorkspaceServiceClient;

  constructor(private opts?: Partial<WorkspaceServiceClientOptions>) {}

  public async init(kernel: IKernel): Promise<void> {
    const baseUrl = process.env.WORKSPACE_SERVICE_URL || this.opts?.url;
    if (!baseUrl) {
      console.warn(
        "WORKSPACE_SERVICE_URL not set; WorkspaceIntegrationModule disabled",
      );
      return;
    }

    this.client = new WorkspaceServiceClient({
      url: baseUrl,
      apiKey: process.env.WORKSPACE_SERVICE_KEY,
      timeoutMs:
        Number(process.env.WORKSPACE_SERVICE_TIMEOUT) || this.opts?.timeoutMs,
      retries: this.opts?.retries ?? 3,
    });

    const healthy = await this.client.health();
    if (!healthy)
      console.warn("WorkspaceService appears unhealthy during init");
  }

  public async dispose(): Promise<void> {}

  public getClient(): WorkspaceServiceClient {
    if (!this.client) throw new Error("WorkspaceServiceClient not initialized");
    return this.client;
  }
}
