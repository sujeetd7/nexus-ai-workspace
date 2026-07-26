export interface ModelConfig {
  provider: string;
  modelId: string;
  type: "chat" | "embedding" | "completion";
  contextLength?: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

export class ModelRegistry {
  private readonly defaultModels: Map<string, Map<string, string>> = new Map();
  private readonly modelConfigs: Map<string, ModelConfig> = new Map();

  constructor() {
    this.initializeDefaults();
    this.initializeModelConfigs();
  }

  private initializeDefaults(): void {
    // Default chat models
    const chatDefaults = new Map<string, string>();
    chatDefaults.set("ollama", "qwen2.5-coder:1.5b");
    chatDefaults.set("openai", "gpt-4o");
    chatDefaults.set("gemini", "gemini-2.5-pro");
    chatDefaults.set("claude", "claude-sonnet-4");
    chatDefaults.set("anthropic", "claude-sonnet-4");
    this.defaultModels.set("chat", chatDefaults);

    // Default embedding models
    const embeddingDefaults = new Map<string, string>();
    embeddingDefaults.set("ollama", "nomic-embed-text");
    embeddingDefaults.set("openai", "text-embedding-ada-002");
    embeddingDefaults.set("gemini", "embedding-001");
    this.defaultModels.set("embedding", embeddingDefaults);
  }

  private initializeModelConfigs(): void {
    // Ollama models
    this.modelConfigs.set("qwen2.5-coder:1.5b", {
      provider: "ollama",
      modelId: "qwen2.5-coder:1.5b",
      type: "chat",
      contextLength: 32768,
      costPer1kTokens: { input: 0, output: 0 }, // Free
    });

    this.modelConfigs.set("nomic-embed-text", {
      provider: "ollama",
      modelId: "nomic-embed-text",
      type: "embedding",
      contextLength: 8192,
      costPer1kTokens: { input: 0, output: 0 }, // Free
    });

    // OpenAI models
    this.modelConfigs.set("gpt-4o", {
      provider: "openai",
      modelId: "gpt-4o",
      type: "chat",
      contextLength: 128000,
      costPer1kTokens: { input: 0.005, output: 0.015 },
    });

    this.modelConfigs.set("gpt-4-turbo", {
      provider: "openai",
      modelId: "gpt-4-turbo",
      type: "chat",
      contextLength: 128000,
      costPer1kTokens: { input: 0.01, output: 0.03 },
    });

    this.modelConfigs.set("text-embedding-ada-002", {
      provider: "openai",
      modelId: "text-embedding-ada-002",
      type: "embedding",
      contextLength: 8191,
      costPer1kTokens: { input: 0.0001, output: 0 },
    });

    // Gemini models
    this.modelConfigs.set("gemini-2.5-pro", {
      provider: "gemini",
      modelId: "gemini-2.5-pro",
      type: "chat",
      contextLength: 1000000,
      costPer1kTokens: { input: 0.00125, output: 0.00375 },
    });

    this.modelConfigs.set("embedding-001", {
      provider: "gemini",
      modelId: "embedding-001",
      type: "embedding",
      contextLength: 2048,
      costPer1kTokens: { input: 0.0001, output: 0 },
    });

    // Anthropic models
    this.modelConfigs.set("claude-sonnet-4", {
      provider: "anthropic",
      modelId: "claude-3-5-sonnet-20241022",
      type: "chat",
      contextLength: 200000,
      costPer1kTokens: { input: 0.003, output: 0.015 },
    });

    this.modelConfigs.set("claude-3-opus-20240229", {
      provider: "anthropic",
      modelId: "claude-3-opus-20240229",
      type: "chat",
      contextLength: 200000,
      costPer1kTokens: { input: 0.015, output: 0.075 },
    });
  }

  public getDefaultProvider(type: "chat" | "embedding" | "completion"): string {
    // Priority order: ollama (free) -> openai -> gemini -> anthropic
    const providers = ["ollama", "openai", "gemini", "anthropic"];
    const typeDefaults = this.defaultModels.get(type);
    
    if (!typeDefaults) {
      return "ollama";
    }

    for (const provider of providers) {
      if (typeDefaults.has(provider)) {
        return provider;
      }
    }

    return "ollama";
  }

  public getDefaultModel(provider: string, type: "chat" | "embedding" | "completion"): string {
    const typeDefaults = this.defaultModels.get(type);
    
    if (!typeDefaults) {
      throw new Error(`Unknown model type: ${type}`);
    }

    const defaultModel = typeDefaults.get(provider);
    
    if (!defaultModel) {
      throw new Error(`No default ${type} model configured for provider: ${provider}`);
    }

    return defaultModel;
  }

  public getModelConfig(modelId: string): ModelConfig | undefined {
    return this.modelConfigs.get(modelId);
  }

  public getProviderModels(provider: string, type?: "chat" | "embedding" | "completion"): ModelConfig[] {
    const models: ModelConfig[] = [];
    const configArray = Array.from(this.modelConfigs.values());

    for (const config of configArray) {
      if (config.provider === provider) {
        if (!type || config.type === type) {
          models.push(config);
        }
      }
    }

    return models;
  }

  public getAllModels(type?: "chat" | "embedding" | "completion"): ModelConfig[] {
    const models: ModelConfig[] = [];
    const configArray = Array.from(this.modelConfigs.values());

    for (const config of configArray) {
      if (!type || config.type === type) {
        models.push(config);
      }
    }

    return models;
  }

  public updateDefaultModel(provider: string, type: "chat" | "embedding" | "completion", modelId: string): void {
    const typeDefaults = this.defaultModels.get(type);
    
    if (!typeDefaults) {
      this.defaultModels.set(type, new Map([[provider, modelId]]));
    } else {
      typeDefaults.set(provider, modelId);
    }
  }

  public addModelConfig(config: ModelConfig): void {
    this.modelConfigs.set(config.modelId, config);
  }
}