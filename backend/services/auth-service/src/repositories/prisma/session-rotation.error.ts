export class SessionRotationConflictError extends Error {
  constructor(message = "SESSION_ROTATION_CONFLICT") {
    super(message);
    this.name = "SessionRotationConflictError";
    Object.setPrototypeOf(this, SessionRotationConflictError.prototype);
  }
}
