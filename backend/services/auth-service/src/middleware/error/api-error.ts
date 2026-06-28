export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}