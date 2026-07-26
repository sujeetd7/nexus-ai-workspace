import { ProviderError } from "../errors/provider.error";

export class ProviderErrorHandler {
  static handle(provider: string, error: any): never {
    throw new ProviderError(
      provider,
      error?.status ?? error?.response?.status ?? 500,
      error?.code ?? "provider_error",
      error?.message ?? "Unknown provider error",
      error,
    );
  }
}
