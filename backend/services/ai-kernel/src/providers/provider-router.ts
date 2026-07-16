import { 
  ILLMProvider, 
  ProviderExecuteRequest, 
  ProviderExecuteResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  HealthStatus,
  StreamChunk,
} from "./provider.interface";
import { UnsupportedProviderException } from "./exceptions/unsupported-provider.exception";

// ProviderRouter delegates all provider operations to AI Service

export class AIServiceDelegatingProvider implements ILLMProvider {
  readonly name: string;
  
  constructor(
    providerName: string,
    private aiServiceClient: any
  ) {
    this.name = providerName;
  }

  async generate(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse> {
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
    return this.aiServiceClient.embeddings({
      ...request,
      provider: this.name,
    });
  }

  async health(): Promise<HealthStatus> {
    return this.aiServiceClient.providerHealth(this.name);
  }

  async models(): Promise<any[]> {
    // AI Service manages model registry
    return [];
  }

  // Legacy method for backward compatibility
  async execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResponse> {
    return this.generate(request);
  }
}

export class ProviderRouter {
  private readonly providers: Map<string, ILLMProvider> = new Map();

  constructor(private aiServiceClient?: any) {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (!this.aiServiceClient) {
      console.warn("ProviderRouter: No AI Service client provided - no providers available");
      return;
    }

    // Initialize providers from AI Service
    this.aiServiceClient.getAvailableProviders()
      .then((providers: string[]) => {
        for (const providerName of providers) {
          const delegatingProvider = new AIServiceDelegatingProvider(
            providerName, 
            this.aiServiceClient
          );
          this.providers.set(providerName.toLowerCase(), delegatingProvider);
        }
        console.log(`ProviderRouter: Initialized ${providers.length} providers from AI Service`);
      })
      .catch((error: any) => {
        console.warn("ProviderRouter: Failed to get providers from AI Service:", error);
        
        // Fallback configuration
        const fallbackProvider = new AIServiceDelegatingProvider("ollama", this.aiServiceClient);
        this.providers.set("ollama", fallbackProvider);
      });
  }

  public getProvider(providerName: string): ILLMProvider {
    const provider = this.providers.get(providerName.toLowerCase());
    
    if (!provider) {
      throw new UnsupportedProviderException(providerName);
    }

    return provider;
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  public hasProvider(providerName: string): boolean {
    return this.providers.has(providerName.toLowerCase());
  }

  public async refreshProviders(): Promise<void> {
    this.providers.clear();
    this.initializeProviders();
  }
}