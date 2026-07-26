export class PluginAgentException extends Error {
  public readonly name = "PluginAgentException";
  public readonly operation?: string;
  
  constructor(operation?: string, message?: string) {
    super(message || `Plugin agent operation${operation ? ` '${operation}'` : ''} failed`);
    this.operation = operation;
    Object.setPrototypeOf(this, PluginAgentException.prototype);
  }
}

export class InvalidPluginOperationException extends Error {
  public readonly name = "InvalidPluginOperationException";
  public readonly operation: string;
  public readonly reason: string;
  
  constructor(operation: string, reason: string, message?: string) {
    super(message || `Invalid plugin operation '${operation}': ${reason}`);
    this.operation = operation;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidPluginOperationException.prototype);
  }
}

export class PluginDiscoveryAgentException extends Error {
  public readonly name = "PluginDiscoveryAgentException";
  public readonly searchPaths: string[];
  public readonly reason: string;
  
  constructor(searchPaths: string[], reason: string, message?: string) {
    super(message || `Plugin discovery failed for paths [${searchPaths.join(', ')}]: ${reason}`);
    this.searchPaths = searchPaths;
    this.reason = reason;
    Object.setPrototypeOf(this, PluginDiscoveryAgentException.prototype);
  }
}

export class PluginLoadAgentException extends Error {
  public readonly name = "PluginLoadAgentException";
  public readonly pluginId: string;
  public readonly reason: string;
  
  constructor(pluginId: string, reason: string, message?: string) {
    super(message || `Plugin load failed for '${pluginId}': ${reason}`);
    this.pluginId = pluginId;
    this.reason = reason;
    Object.setPrototypeOf(this, PluginLoadAgentException.prototype);
  }
}

export class PluginUnloadAgentException extends Error {
  public readonly name = "PluginUnloadAgentException";
  public readonly pluginId: string;
  public readonly reason: string;
  
  constructor(pluginId: string, reason: string, message?: string) {
    super(message || `Plugin unload failed for '${pluginId}': ${reason}`);
    this.pluginId = pluginId;
    this.reason = reason;
    Object.setPrototypeOf(this, PluginUnloadAgentException.prototype);
  }
}

export class PluginReloadAgentException extends Error {
  public readonly name = "PluginReloadAgentException";
  public readonly pluginId: string;
  public readonly reason: string;
  
  constructor(pluginId: string, reason: string, message?: string) {
    super(message || `Plugin reload failed for '${pluginId}': ${reason}`);
    this.pluginId = pluginId;
    this.reason = reason;
    Object.setPrototypeOf(this, PluginReloadAgentException.prototype);
  }
}

export class PluginValidationAgentException extends Error {
  public readonly name = "PluginValidationAgentException";
  public readonly pluginId: string;
  public readonly validationErrors: string[];
  
  constructor(pluginId: string, errors: string[], message?: string) {
    super(message || `Plugin validation failed for '${pluginId}': ${errors.join(", ")}`);
    this.pluginId = pluginId;
    this.validationErrors = errors;
    Object.setPrototypeOf(this, PluginValidationAgentException.prototype);
  }
}

export class PluginListAgentException extends Error {
  public readonly name = "PluginListAgentException";
  public readonly reason: string;
  
  constructor(reason: string, message?: string) {
    super(message || `Plugin listing failed: ${reason}`);
    this.reason = reason;
    Object.setPrototypeOf(this, PluginListAgentException.prototype);
  }
}

export class PluginRegistryUnavailableException extends Error {
  public readonly name = "PluginRegistryUnavailableException";
  
  constructor(message?: string) {
    super(message || "Plugin registry is not available");
    Object.setPrototypeOf(this, PluginRegistryUnavailableException.prototype);
  }
}

export class PluginLoaderUnavailableException extends Error {
  public readonly name = "PluginLoaderUnavailableException";
  
  constructor(message?: string) {
    super(message || "Plugin loader is not available");
    Object.setPrototypeOf(this, PluginLoaderUnavailableException.prototype);
  }
}

export class InvalidPluginDiscoveryOptionsException extends Error {
  public readonly name = "InvalidPluginDiscoveryOptionsException";
  public readonly missingFields: string[];
  
  constructor(missingFields: string[], message?: string) {
    super(message || `Invalid plugin discovery options - missing fields: ${missingFields.join(', ')}`);
    this.missingFields = missingFields;
    Object.setPrototypeOf(this, InvalidPluginDiscoveryOptionsException.prototype);
  }
}