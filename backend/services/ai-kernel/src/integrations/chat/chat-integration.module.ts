import { IKernelModule } from "../../kernel/kernel-module.interface";
import { IKernel } from "../../kernel/kernel.interface";
import {
  ChatServiceClient,
  ChatServiceClientOptions,
} from "./chat-service.client";

export class ChatIntegrationModule implements IKernelModule {
  public readonly name = "ChatIntegrationModule";

  private client?: ChatServiceClient;

  constructor(private opts?: Partial<ChatServiceClientOptions>) {}

  public async init(kernel: IKernel): Promise<void> {
    const baseUrl = process.env.CHAT_SERVICE_URL || this.opts?.url;
    if (!baseUrl) {
      console.warn(
        "CHAT_SERVICE_URL not set; ChatIntegrationModule disabled",
      );
      return;
    }

    this.client = new ChatServiceClient({
      url: baseUrl,
      apiKey: process.env.CHAT_SERVICE_KEY,
      timeoutMs:
        Number(process.env.CHAT_SERVICE_TIMEOUT) || this.opts?.timeoutMs,
      retries: this.opts?.retries ?? 3,
    });

    const healthy = await this.client.health();
    if (!healthy) console.warn("ChatService appears unhealthy during init");
  }

  public async dispose(): Promise<void> {}

  public getClient(): ChatServiceClient {
    if (!this.client) throw new Error("ChatServiceClient not initialized");
    return this.client;
  }
}