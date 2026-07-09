export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);

    this.name = "ProviderError";

    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}
