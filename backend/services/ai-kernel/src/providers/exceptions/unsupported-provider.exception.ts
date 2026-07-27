export class UnsupportedProviderException extends Error {
  constructor(providerName: string) {
    super(`Unsupported provider: ${providerName}`);
    this.name = "UnsupportedProviderException";
  }
}
