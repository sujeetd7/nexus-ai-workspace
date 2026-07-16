export class DuplicateToolException extends Error {
  public readonly code = "DUPLICATE_TOOL";
  public readonly toolName: string;
  public readonly existingServerId: string;
  public readonly newServerId: string;

  constructor(toolName: string, existingServerId: string, newServerId: string) {
    super(`Tool '${toolName}' already exists from server '${existingServerId}', cannot register from server '${newServerId}'`);
    this.name = "DuplicateToolException";
    this.toolName = toolName;
    this.existingServerId = existingServerId;
    this.newServerId = newServerId;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DuplicateToolException);
    }
  }
}

export class ServerRegistrationException extends Error {
  public readonly code = "SERVER_REGISTRATION_FAILED";
  public readonly serverId: string;
  public readonly operation: string;

  constructor(serverId: string, operation: string, message: string, cause?: Error) {
    super(`Server registration failed for '${serverId}' during '${operation}': ${message}`);
    this.name = "ServerRegistrationException";
    this.serverId = serverId;
    this.operation = operation;

    if (cause && Error.captureStackTrace) {
      Error.captureStackTrace(this, ServerRegistrationException);
    }
  }
}