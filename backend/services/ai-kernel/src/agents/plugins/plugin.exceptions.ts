export class PluginException extends Error {
  public readonly name = "PluginException";
  public readonly pluginId?: string;
  public readonly operation: string;

  constructor(operation: string, pluginId?: string, message?: string) {
    super(
      message ||
        `Plugin operation '${operation}' failed${pluginId ? ` for plugin '${pluginId}'` : ""}`,
    );
    this.operation = operation;
    this.pluginId = pluginId;
    Object.setPrototypeOf(this, PluginException.prototype);
  }
}

export class InvalidPluginException extends Error {
  public readonly name = "InvalidPluginException";
  public readonly pluginId: string;
  public readonly validationErrors: string[];

  constructor(pluginId: string, errors: string[], message?: string) {
    super(message || `Invalid plugin '${pluginId}': ${errors.join(", ")}`);
    this.pluginId = pluginId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, InvalidPluginException.prototype);
  }
}

export class PluginLoadException extends Error {
  public readonly name = "PluginLoadException";
  public readonly pluginId: string;
  public readonly sourcePath: string;
  public readonly reason: string;

  constructor(
    pluginId: string,
    sourcePath: string,
    reason: string,
    message?: string,
  ) {
    super(
      message ||
        `Failed to load plugin '${pluginId}' from '${sourcePath}': ${reason}`,
    );
    this.pluginId = pluginId;
    this.sourcePath = sourcePath;
    this.reason = reason;
    Object.setPrototypeOf(this, PluginLoadException.prototype);
  }
}

export class PluginValidationException extends Error {
  public readonly name = "PluginValidationException";
  public readonly pluginId: string;
  public readonly validationErrors: string[];
  public readonly validationWarnings: string[];

  constructor(
    pluginId: string,
    errors: string[],
    warnings: string[] = [],
    message?: string,
  ) {
    super(
      message ||
        `Plugin validation failed for '${pluginId}': ${errors.join(", ")}`,
    );
    this.pluginId = pluginId;
    this.validationErrors = errors;
    this.validationWarnings = warnings;
    Object.setPrototypeOf(this, PluginValidationException.prototype);
  }
}

export class DuplicatePluginException extends Error {
  public readonly name = "DuplicatePluginException";
  public readonly pluginId: string;
  public readonly conflictType: "id" | "name" | "capability";
  public readonly existingPlugin: string;

  constructor(
    pluginId: string,
    conflictType: "id" | "name" | "capability",
    existingPlugin: string,
    message?: string,
  ) {
    super(
      message ||
        `Duplicate plugin ${conflictType} '${pluginId}' conflicts with existing plugin '${existingPlugin}'`,
    );
    this.pluginId = pluginId;
    this.conflictType = conflictType;
    this.existingPlugin = existingPlugin;
    Object.setPrototypeOf(this, DuplicatePluginException.prototype);
  }
}

export class PluginNotFoundException extends Error {
  public readonly name = "PluginNotFoundException";
  public readonly pluginId: string;

  constructor(pluginId: string, message?: string) {
    super(message || `Plugin '${pluginId}' not found`);
    this.pluginId = pluginId;
    Object.setPrototypeOf(this, PluginNotFoundException.prototype);
  }
}

export class PluginStateException extends Error {
  public readonly name = "PluginStateException";
  public readonly pluginId: string;
  public readonly currentState: string;
  public readonly expectedState: string;

  constructor(
    pluginId: string,
    currentState: string,
    expectedState: string,
    message?: string,
  ) {
    super(
      message ||
        `Plugin '${pluginId}' is in state '${currentState}' but expected '${expectedState}'`,
    );
    this.pluginId = pluginId;
    this.currentState = currentState;
    this.expectedState = expectedState;
    Object.setPrototypeOf(this, PluginStateException.prototype);
  }
}
