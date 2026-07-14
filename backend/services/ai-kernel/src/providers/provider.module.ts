import { IKernel } from "../kernel/kernel.interface";
import { OllamaProvider } from "./clients/ollama.provider";

import { IProviderModule } from "./provider-module.interface";

import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "./provider.interface";

import { AIServiceClient } from "../integrations/ai-service/ai-service.client";
import { AIServiceClientOptions } from "../integrations/ai-service/ai-service.interface";

export class ProviderModule implements IProviderModule {
  public readonly name = "ProviderModule";

  private readonly providers = new Map<string, ILLMProvider>();

  private kernel!: IKernel;
  private aiServiceClient?: AIServiceClient;

  async init(kernel: IKernel): Promise<void> {
    this.kernel = kernel;

    // register a local provider as a fallback
    this.registerProvider("ollama", new OllamaProvider());

    // If AI service is configured, create a client to delegate provider calls
    const url = process.env.AI_SERVICE_URL;
    if (url) {
      const opts: AIServiceClientOptions = {
        url,
        apiKey: process.env.AI_SERVICE_KEY,
        timeoutMs: process.env.AI_SERVICE_TIMEOUT
          ? Number(process.env.AI_SERVICE_TIMEOUT)
          : undefined,
      };

      try {
        this.aiServiceClient = new AIServiceClient(
          opts as AIServiceClientOptions,
        );
      } catch (err) {
        // swallow - we'll fallback to local providers
        console.warn(
          "AIServiceClient init failed, falling back to local providers",
          err,
        );
      }
    }
  }

  async dispose(): Promise<void> {
    this.providers.clear();
  }

  public registerProvider(name: string, provider: ILLMProvider): void {
    if (this.providers.has(name)) {
      throw new Error(`${name} already registered`);
    }

    this.providers.set(name, provider);
  }

  public getProvider(name: string): ILLMProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(`Provider '${name}' not found.`);
    }

    return provider;
  }

  public getToolDefinitions() {
    const toolModule = this.kernel.getModule<any>("ToolModule");

    return toolModule.getRegistry().definitions();
  }

  async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    // Prefer delegating to centralized AI-Service when available
    if (this.aiServiceClient) {
      try {
        return await this.aiServiceClient.execute(request);
      } catch (err) {
        console.warn(
          "AIService call failed, falling back to local provider",
          err,
        );
        // continue to local provider fallback
      }
    }

    const provider = this.getProvider(request.provider);

    return provider.execute(request);
  }

  public hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  public listProviders(): string[] {
    return [...this.providers.keys()];
  }
}
