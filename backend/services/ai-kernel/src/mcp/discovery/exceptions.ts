export class DiscoveryTimeoutException extends Error {
  public readonly code = "DISCOVERY_TIMEOUT";
  public readonly serverId: string;
  public readonly discoveryType: string;
  public readonly timeout: number;

  constructor(serverId: string, discoveryType: string, timeout: number) {
    super(`Discovery timeout for ${discoveryType} on server ${serverId} after ${timeout}ms`);
    this.name = "DiscoveryTimeoutException";
    this.serverId = serverId;
    this.discoveryType = discoveryType;
    this.timeout = timeout;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DiscoveryTimeoutException);
    }
  }
}

export class DiscoveryFailedException extends Error {
  public readonly code = "DISCOVERY_FAILED";
  public readonly serverId: string;
  public readonly discoveryType: string;
  public readonly originalError?: Error;

  constructor(serverId: string, discoveryType: string, message: string, originalError?: Error) {
    super(`Discovery failed for ${discoveryType} on server ${serverId}: ${message}`);
    this.name = "DiscoveryFailedException";
    this.serverId = serverId;
    this.discoveryType = discoveryType;
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DiscoveryFailedException);
    }
  }
}

export class CapabilityNotFoundException extends Error {
  public readonly code = "CAPABILITY_NOT_FOUND";
  public readonly serverId: string;
  public readonly capability: string;
  public readonly availableCapabilities: string[];

  constructor(serverId: string, capability: string, availableCapabilities: string[] = []) {
    super(`Capability '${capability}' not found on server ${serverId}. Available: ${availableCapabilities.join(", ")}`);
    this.name = "CapabilityNotFoundException";
    this.serverId = serverId;
    this.capability = capability;
    this.availableCapabilities = availableCapabilities;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CapabilityNotFoundException);
    }
  }
}