import { IKernel } from "../kernel/kernel.interface";
import { IProviderModule } from "./provider-module.interface";
import {
  ILLMProvider,
  ProviderExecuteRequest,
  ProviderExecuteResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  HealthStatus,
  StreamChunk,
} from "./provider.interface";
import { AIServiceIntegrationModule } from "../integrations/ai-service/ai-service-integration.module";

// AI Service Provider Wrapper - delegates all calls to AI Service
class AIServiceProviderWrapper implements ILLMProvider {
  readonly name: string;

  constructor(
    providerName: string,
    private aiServiceClient: any,
  ) {
    this.name = providerName;
  }

  async generate(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    return this.aiServiceClient.generate({
      ...request,
      provider: this.name,
    });
  }

  async *stream(request: ProviderExecuteRequest): AsyncIterable<StreamChunk> {
    yield* this.aiServiceClient.stream({
      ...request,
      provider: this.name,
    });
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.aiServiceClient.embeddings(request);
  }

  async health(): Promise<HealthStatus> {
    return this.aiServiceClient.providerHealth(this.name);
  }

  async models(): Promise<any[]> {
    // Delegate to AI Service - models are managed there
    return [];
  }

  // Legacy method for backward compatibility
  async execute(
    request: ProviderExecuteRequest,
  ): Promise<ProviderExecuteResponse> {
    return this.generate(request);
  }
}

export class ProviderModule implements IProviderModule {
  public readonly name = "ProviderModule";

  private readonly providers = new Map<string, ILLMProvider>();
  private kernel!: IKernel;
  private aiServiceModule?: AIServiceIntegrationModule;

  async init(kernel: IKernel): Promise<void> {
    this.kernel = kernel;

    // Get AI Service integration module
    try {
      this.aiServiceModule = kernel.getModule<AIServiceIntegrationModule>(
        "AIServiceIntegrationModule",
      );

      if (this.aiServiceModule) {
        const aiServiceClient = this.aiServiceModule.getClient();

        // Initialize providers from AI Service
        const availableProviders =
          await aiServiceClient.getAvailableProviders();

        // Create AI Service delegating wrappers
        for (const providerName of availableProviders) {
          const wrapper = new AIServiceProviderWrapper(
            providerName,
            aiServiceClient,
          );
          this.providers.set(providerName, wrapper);
        }

        console.log(
          `ProviderModule: Registered ${availableProviders.length} providers from AI Service`,
        );
      }
    } catch (error) {
      console.warn("Failed to initialize AI Service providers:", error);

      // Fallback configuration
      const defaultWrapper = new AIServiceProviderWrapper("ollama", {
        generate: this.createFallbackMethod("generate"),
        stream: this.createFallbackStream(),
        embeddings: this.createFallbackMethod("embeddings"),
        providerHealth: this.createFallbackMethod("health"),
        getAvailableProviders: () => Promise.resolve(["ollama"]),
      });

      this.providers.set("ollama", defaultWrapper);
      console.warn("ProviderModule: Using fallback provider configuration");
    }
  }

  async dispose(): Promise<void> {
    this.providers.clear();
  }

  // Provider registration is handled automatically via AI Service
  // Manual registration is no longer supported

  public getProvider(name: string): ILLMProvider {
    const provider = this.providers.get(name);

    if (!provider) {
      throw new Error(
        `Provider '${name}' not found. Available providers: ${this.listProviders().join(", ")}`,
      );
    }

    return provider;
  }

  public getToolDefinitions() {
    try {
      const toolModule = this.kernel.getModule<any>("ToolModule");
      return toolModule.getRegistry().definitions();
    } catch (error) {
      console.warn("ToolModule not available:", error);
      return [];
    }
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
    return Array.from(this.providers.keys());
  }

  // Fallback methods when AI Service is not available
  private createFallbackMethod(methodName: string) {
    return async (...args: any[]) => {
      throw new Error(
        `${methodName} not available: AI Service is not connected`,
      );
    };
  }

  private createFallbackStream() {
    return async function* (...args: any[]) {
      throw new Error(`Stream not available: AI Service is not connected`);
    };
  }
}
