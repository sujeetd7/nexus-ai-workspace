import { AI_PROVIDERS } from "./ai.config";

export class ProviderConfig {
  static get(provider: string) {
    return AI_PROVIDERS[provider];
  }

  static getDefaultModel(provider: string) {
    return this.get(provider)?.defaultModel;
  }

  static getEmbeddingModel(provider: string): string {
    switch (provider) {
      case "openai":
        return process.env.OPENAI_EMBEDDING_MODEL!;

      case "ollama":
        return process.env.OLLAMA_EMBEDDING_MODEL!;

      case "gemini":
        return process.env.GEMINI_EMBEDDING_MODEL!;

      case "claude":
        return process.env.CLAUDE_EMBEDDING_MODEL!;

      default:
        throw new Error("Unsupported provider");
    }
  }
}
