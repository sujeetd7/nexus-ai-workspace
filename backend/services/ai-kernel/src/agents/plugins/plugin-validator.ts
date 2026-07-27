import {
  PluginDescriptor,
  PluginValidationResult,
  PluginValidationStatus,
  PluginMetadata,
  PluginCapabilities,
  PluginFactory,
} from "./plugin.types";
import { PluginValidationException } from "./plugin.exceptions";

export interface IPluginValidator {
  validate(plugin: PluginDescriptor): Promise<PluginValidationResult>;
  validateMetadata(
    metadata: PluginMetadata,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
  validateCapabilities(
    capabilities: PluginCapabilities,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
  validateFactory(
    factory: PluginFactory,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
  checkDuplicates(
    plugin: PluginDescriptor,
    existingPlugins: PluginDescriptor[],
  ): Promise<{
    duplicateId: boolean;
    duplicateName: boolean;
    duplicateCapabilities: string[];
  }>;
}

export class PluginValidator implements IPluginValidator {
  public async validate(
    plugin: PluginDescriptor,
  ): Promise<PluginValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate metadata
    const metadataResult = await this.validateMetadata(plugin.metadata);
    errors.push(...metadataResult.errors);
    warnings.push(...metadataResult.warnings);

    // Validate capabilities
    const capabilitiesResult = await this.validateCapabilities(
      plugin.capabilities,
    );
    errors.push(...capabilitiesResult.errors);
    warnings.push(...capabilitiesResult.warnings);

    // Validate factory
    const factoryResult = await this.validateFactory(plugin.factory);
    errors.push(...factoryResult.errors);
    warnings.push(...factoryResult.warnings);

    // Validate configuration schema if present
    let configSchemaValid = true;
    try {
      if (plugin.metadata.configSchema) {
        // Basic schema validation - check if it's a valid object
        if (typeof plugin.metadata.configSchema !== "object") {
          configSchemaValid = false;
          errors.push("Configuration schema must be an object");
        }
      }
    } catch (error) {
      configSchemaValid = false;
      errors.push(
        `Invalid configuration schema: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Check dependencies (simplified - in real implementation would resolve actual dependencies)
    let dependenciesResolved = true;
    if (plugin.metadata.dependencies) {
      for (const [dep, version] of Object.entries(
        plugin.metadata.dependencies,
      )) {
        // Simplified check - just verify it's a valid version string
        if (!version || typeof version !== "string") {
          dependenciesResolved = false;
          errors.push(`Invalid dependency version for '${dep}': ${version}`);
        }
      }
    }

    // Determine overall validation status
    const isValid = errors.length === 0;
    const status = isValid
      ? warnings.length > 0
        ? PluginValidationStatus.WARNING
        : PluginValidationStatus.VALID
      : PluginValidationStatus.INVALID;

    return {
      status,
      isValid,
      errors,
      warnings,
      checks: {
        metadataValid: metadataResult.isValid,
        capabilitiesValid: capabilitiesResult.isValid,
        factoryValid: factoryResult.isValid,
        configSchemaValid,
        dependenciesResolved,
        duplicateId: false, // Set by caller when checking against existing plugins
        duplicateName: false, // Set by caller when checking against existing plugins
        duplicateCapabilities: [], // Set by caller when checking against existing plugins
      },
    };
  }

  public async validateMetadata(
    metadata: PluginMetadata,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (
      !metadata.id ||
      typeof metadata.id !== "string" ||
      metadata.id.trim().length === 0
    ) {
      errors.push("Plugin ID is required and must be a non-empty string");
    } else {
      // Check ID format (alphanumeric, hyphens, underscores only)
      if (!/^[a-zA-Z0-9_-]+$/.test(metadata.id)) {
        errors.push(
          "Plugin ID must contain only alphanumeric characters, hyphens, and underscores",
        );
      }
    }

    if (
      !metadata.name ||
      typeof metadata.name !== "string" ||
      metadata.name.trim().length === 0
    ) {
      errors.push("Plugin name is required and must be a non-empty string");
    }

    if (!metadata.version || typeof metadata.version !== "string") {
      errors.push("Plugin version is required and must be a string");
    } else {
      // Basic semver validation
      if (!/^\d+\.\d+\.\d+/.test(metadata.version)) {
        warnings.push(
          "Plugin version should follow semantic versioning (x.y.z)",
        );
      }
    }

    if (!metadata.description || typeof metadata.description !== "string") {
      warnings.push("Plugin description should be provided");
    }

    if (!metadata.agentType) {
      errors.push("Agent type is required");
    }

    if (!metadata.priority) {
      errors.push("Agent priority is required");
    }

    // Validate dates
    if (!metadata.createdAt || !(metadata.createdAt instanceof Date)) {
      errors.push("Plugin createdAt must be a valid Date");
    }

    if (!metadata.updatedAt || !(metadata.updatedAt instanceof Date)) {
      errors.push("Plugin updatedAt must be a valid Date");
    }

    // Optional field validations
    if (metadata.author && typeof metadata.author !== "string") {
      warnings.push("Plugin author should be a string");
    }

    if (
      metadata.homepage &&
      (typeof metadata.homepage !== "string" ||
        !this.isValidUrl(metadata.homepage))
    ) {
      warnings.push("Plugin homepage should be a valid URL");
    }

    if (metadata.keywords && !Array.isArray(metadata.keywords)) {
      warnings.push("Plugin keywords should be an array of strings");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public async validateCapabilities(
    capabilities: PluginCapabilities,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate capabilities array
    if (
      !capabilities.capabilities ||
      !Array.isArray(capabilities.capabilities)
    ) {
      errors.push("Plugin capabilities must be an array");
    } else {
      if (capabilities.capabilities.length === 0) {
        warnings.push("Plugin has no capabilities defined");
      }

      // Validate each capability
      capabilities.capabilities.forEach((capability, index) => {
        if (!capability || typeof capability !== "object") {
          errors.push(`Capability at index ${index} must be an object`);
          return;
        }

        if (!capability.name || typeof capability.name !== "string") {
          errors.push(`Capability at index ${index} must have a valid name`);
        }

        if (
          !capability.description ||
          typeof capability.description !== "string"
        ) {
          errors.push(
            `Capability at index ${index} must have a valid description`,
          );
        }
      });
    }

    // Validate supported types
    if (
      !capabilities.supportedInputTypes ||
      !Array.isArray(capabilities.supportedInputTypes)
    ) {
      errors.push("Supported input types must be an array");
    } else if (capabilities.supportedInputTypes.length === 0) {
      warnings.push("Plugin has no supported input types");
    }

    if (
      !capabilities.supportedOutputTypes ||
      !Array.isArray(capabilities.supportedOutputTypes)
    ) {
      errors.push("Supported output types must be an array");
    } else if (capabilities.supportedOutputTypes.length === 0) {
      warnings.push("Plugin has no supported output types");
    }

    // Validate optional numeric fields
    if (capabilities.maxConcurrentExecutions !== undefined) {
      if (
        typeof capabilities.maxConcurrentExecutions !== "number" ||
        capabilities.maxConcurrentExecutions < 1
      ) {
        errors.push("Max concurrent executions must be a positive number");
      }
    }

    if (capabilities.timeoutMs !== undefined) {
      if (
        typeof capabilities.timeoutMs !== "number" ||
        capabilities.timeoutMs < 0
      ) {
        errors.push("Timeout must be a non-negative number");
      }
    }

    if (capabilities.retryAttempts !== undefined) {
      if (
        typeof capabilities.retryAttempts !== "number" ||
        capabilities.retryAttempts < 0
      ) {
        errors.push("Retry attempts must be a non-negative number");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public async validateFactory(
    factory: PluginFactory,
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!factory || typeof factory !== "object") {
      errors.push("Plugin factory must be an object");
      return { isValid: false, errors, warnings };
    }

    // Check required method
    if (!factory.createAgent || typeof factory.createAgent !== "function") {
      errors.push("Plugin factory must have a createAgent method");
    }

    // Check optional methods
    if (
      factory.validateConfig &&
      typeof factory.validateConfig !== "function"
    ) {
      warnings.push("Plugin factory validateConfig should be a function");
    }

    if (
      factory.getDefaultConfig &&
      typeof factory.getDefaultConfig !== "function"
    ) {
      warnings.push("Plugin factory getDefaultConfig should be a function");
    }

    // Try to call getDefaultConfig if it exists to validate it
    if (factory.getDefaultConfig) {
      try {
        const defaultConfig = factory.getDefaultConfig();
        if (defaultConfig && typeof defaultConfig !== "object") {
          warnings.push("Factory getDefaultConfig should return an object");
        }
      } catch (error) {
        warnings.push(
          `Factory getDefaultConfig threw an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public async checkDuplicates(
    plugin: PluginDescriptor,
    existingPlugins: PluginDescriptor[],
  ): Promise<{
    duplicateId: boolean;
    duplicateName: boolean;
    duplicateCapabilities: string[];
  }> {
    let duplicateId = false;
    let duplicateName = false;
    const duplicateCapabilities: string[] = [];

    for (const existing of existingPlugins) {
      // Skip self-comparison
      if (
        existing.id === plugin.id &&
        existing.sourcePath === plugin.sourcePath
      ) {
        continue;
      }

      // Check ID duplicates
      if (existing.id === plugin.id) {
        duplicateId = true;
      }

      // Check name duplicates
      if (existing.name === plugin.name) {
        duplicateName = true;
      }

      // Check capability duplicates
      const existingCapabilityNames = existing.capabilities.capabilities.map(
        (cap) => cap.name,
      );
      const pluginCapabilityNames = plugin.capabilities.capabilities.map(
        (cap) => cap.name,
      );

      for (const capName of pluginCapabilityNames) {
        if (
          existingCapabilityNames.includes(capName) &&
          !duplicateCapabilities.includes(capName)
        ) {
          duplicateCapabilities.push(capName);
        }
      }
    }

    return {
      duplicateId,
      duplicateName,
      duplicateCapabilities,
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
