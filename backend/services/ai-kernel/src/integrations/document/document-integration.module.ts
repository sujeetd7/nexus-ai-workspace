import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import {
  DocumentServiceClient,
  DocumentServiceClientOptions,
} from "./document-service.client";

export class DocumentIntegrationModule implements IKernelModule {
  public readonly name = "DocumentIntegrationModule";

  private client?: DocumentServiceClient;

  constructor(private opts?: Partial<DocumentServiceClientOptions>) {}

  public async init(kernel: IKernel): Promise<void> {
    const baseUrl = process.env.DOCUMENT_SERVICE_URL || this.opts?.url;
    if (!baseUrl) {
      console.warn(
        "DOCUMENT_SERVICE_URL not set; DocumentIntegrationModule disabled",
      );
      return;
    }

    this.client = new DocumentServiceClient({
      url: baseUrl,
      apiKey: process.env.DOCUMENT_SERVICE_KEY,
      timeoutMs:
        Number(process.env.DOCUMENT_SERVICE_TIMEOUT) || this.opts?.timeoutMs,
      retries: this.opts?.retries ?? 3,
    });

    const healthy = await this.client.health();
    if (!healthy) console.warn("DocumentService appears unhealthy during init");
  }

  public async dispose(): Promise<void> {}

  public getClient(): DocumentServiceClient {
    if (!this.client) throw new Error("DocumentServiceClient not initialized");
    return this.client;
  }
}
