export class ChatServiceError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ChatServiceError";
    Object.setPrototypeOf(this, ChatServiceError.prototype);
  }
}
