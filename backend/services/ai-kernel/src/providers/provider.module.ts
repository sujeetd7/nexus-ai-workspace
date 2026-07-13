import { IKernel } from "../kernel/kernel.interface";
import { OllamaProvider } from "./clients/ollama.provider";

import { IProviderModule } from "./provider-module.interface";

import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
} from "./provider.interface";

export class ProviderModule implements IProviderModule {
  public readonly name = "ProviderModule";

  private readonly providers = new Map<string, ILLMProvider>();

  async init(kernel: IKernel): Promise<void> {
    this.registerProvider("ollama", new OllamaProvider());
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

  async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
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
