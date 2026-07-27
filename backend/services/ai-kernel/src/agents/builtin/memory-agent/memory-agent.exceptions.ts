export class MemoryAgentException extends Error {
  public readonly name = "MemoryAgentException";
  public readonly operation?: string;

  constructor(operation?: string, message?: string) {
    super(
      message ||
        `Memory agent operation${operation ? ` '${operation}'` : ""} failed`,
    );
    this.operation = operation;
    Object.setPrototypeOf(this, MemoryAgentException.prototype);
  }
}

export class InvalidMemoryOperationException extends Error {
  public readonly name = "InvalidMemoryOperationException";
  public readonly operation: string;
  public readonly reason: string;

  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid memory operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidMemoryOperationException.prototype);
  }
}

export class MemoryOperationFailedException extends Error {
  public readonly name = "MemoryOperationFailedException";
  public readonly operation: string;
  public readonly type?: string;
  public readonly key?: string;

  constructor(
    operation: string,
    type?: string,
    key?: string,
    message?: string,
  ) {
    super(
      message ||
        `Memory operation '${operation}' failed${type ? ` for type '${type}'` : ""}${key ? ` with key '${key}'` : ""}`,
    );
    this.operation = operation;
    this.type = type;
    this.key = key;
    Object.setPrototypeOf(this, MemoryOperationFailedException.prototype);
  }
}

export class MemorySummaryUnavailableException extends Error {
  public readonly name = "MemorySummaryUnavailableException";
  public readonly type: string;

  constructor(type: string, message?: string) {
    super(
      message ||
        `Memory summary unavailable for type '${type}' - no summary service available`,
    );
    this.type = type;
    Object.setPrototypeOf(this, MemorySummaryUnavailableException.prototype);
  }
}

export class MemoryNotAvailableException extends Error {
  public readonly name = "MemoryNotAvailableException";
  public readonly type: string;

  constructor(type: string, message?: string) {
    super(message || `Memory type '${type}' not available`);
    this.type = type;
    Object.setPrototypeOf(this, MemoryNotAvailableException.prototype);
  }
}

export class InvalidMemoryContextException extends Error {
  public readonly name = "InvalidMemoryContextException";
  public readonly missingFields: string[];

  constructor(missingFields: string[], message?: string) {
    super(
      message ||
        `Invalid memory context - missing fields: ${missingFields.join(", ")}`,
    );
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidMemoryContextException.prototype);
  }
}
