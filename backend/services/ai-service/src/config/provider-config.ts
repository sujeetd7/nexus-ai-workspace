import { AI_PROVIDERS } from "./ai.config";

export class ProviderConfig {
  static get(provider: string) {
    return AI_PROVIDERS[provider];
  }

  static getDefaultModel(provider: string) {
    return this.get(provider)?.defaultModel;
  }
}
