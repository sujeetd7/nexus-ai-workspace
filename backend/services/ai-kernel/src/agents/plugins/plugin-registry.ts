import { randomUUID } from "crypto";
import {
  PluginDescriptor,
  PluginStatus,
  PluginHealth,
  PluginValidationResult,
} from "./plugin.types";
import {
  PluginNotFoundException,
  DuplicatePluginException,
  PluginStateException,
} from "./plugin.exceptions";
import { IPluginValidator, PluginValidator } from "./plugin-validator";

export interface IPluginRegistry {
  register(plugin: PluginDescriptor): Promise<void>;
  unregister(pluginId: string): Promise<boolean>;
  find(pluginId: string): Promise<PluginDescriptor | undefined>;
  findByName(name: string): Promise<PluginDescriptor | undefined>;
  list(): Promise<PluginDescriptor[]>;
  listByStatus(status: PluginStatus): Promise<PluginDescriptor[]>;
  exists(pluginId: string): Promise<boolean>;
  count(): Promise<number>;
  clear(): Promise<void>;

  // Status management
  updateStatus(pluginId: string, status: PluginStatus): Promise<void>;
  getStatus(pluginId: string): Promise<PluginStatus>;

  // Validation
  validate(pluginId: string): Promise<PluginValidationResult>;
  validateAll(): Promise<Record<string, PluginValidationResult>>;

  // Health and metrics
  health(): Promise<PluginHealth>;
  getUsageStats(
    pluginId: string,
  ): Promise<{ usageCount: number; lastUsed?: Date; averageLoadTime?: number }>;
  incrementUsage(pluginId: string): Promise<void>;
}

export class PluginRegistry implements IPluginRegistry {
  private readonly plugins: Map<string, PluginDescriptor> = new Map();
  private readonly pluginsByName: Map<string, string> = new Map(); // name -> id mapping
  private readonly validator: IPluginValidator;
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];

  constructor() {
    this.validator = new PluginValidator();
  }

  public async register(plugin: PluginDescriptor): Promise<void> {
    // Check for duplicate ID
    if (this.plugins.has(plugin.id)) {
      throw new DuplicatePluginException(
        plugin.id,
        "id",
        plugin.id,
        "Plugin with this ID already exists",
      );
    }

    // Check for duplicate name
    if (this.pluginsByName.has(plugin.name)) {
      const existingId = this.pluginsByName.get(plugin.name);
      throw new DuplicatePluginException(
        plugin.name,
        "name",
        existingId || "unknown",
        "Plugin with this name already exists",
      );
    }

    // Validate plugin before registration
    const validationResult = await this.validator.validate(plugin);
    if (!validationResult.isValid) {
      throw new DuplicatePluginException(
        plugin.id,
        "id",
        plugin.id,
        `Plugin validation failed: ${validationResult.errors.join(", ")}`,
      );
    }

    // Check for capability duplicates (warnings only)
    const duplicateCheck = await this.validator.checkDuplicates(
      plugin,
      Array.from(this.plugins.values()),
    );
    if (duplicateCheck.duplicateCapabilities.length > 0) {
      this.warnings.push(
        `Plugin '${plugin.id}' has duplicate capabilities: ${duplicateCheck.duplicateCapabilities.join(", ")}`,
      );
    }

    // Register plugin
    plugin.status = PluginStatus.DISCOVERED;
    this.plugins.set(plugin.id, plugin);
    this.pluginsByName.set(plugin.name, plugin.id);
  }

  public async unregister(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return false;
    }

    // Check if plugin is in a state that allows unregistration
    if (plugin.status === PluginStatus.ACTIVE) {
      throw new PluginStateException(
        pluginId,
        plugin.status,
        "inactive",
        "Cannot unregister active plugin",
      );
    }

    // Remove from mappings
    this.pluginsByName.delete(plugin.name);
    this.plugins.delete(pluginId);

    return true;
  }

  public async find(pluginId: string): Promise<PluginDescriptor | undefined> {
    return this.plugins.get(pluginId);
  }

  public async findByName(name: string): Promise<PluginDescriptor | undefined> {
    const pluginId = this.pluginsByName.get(name);
    if (!pluginId) {
      return undefined;
    }
    return this.plugins.get(pluginId);
  }

  public async list(): Promise<PluginDescriptor[]> {
    return Array.from(this.plugins.values());
  }

  public async listByStatus(status: PluginStatus): Promise<PluginDescriptor[]> {
    return Array.from(this.plugins.values()).filter(
      (plugin) => plugin.status === status,
    );
  }

  public async exists(pluginId: string): Promise<boolean> {
    return this.plugins.has(pluginId);
  }

  public async count(): Promise<number> {
    return this.plugins.size;
  }

  public async clear(): Promise<void> {
    // Check if any plugins are active
    const activePlugins = Array.from(this.plugins.values()).filter(
      (p) => p.status === PluginStatus.ACTIVE,
    );
    if (activePlugins.length > 0) {
      throw new PluginStateException(
        "registry",
        "has-active-plugins",
        "no-active-plugins",
        `Cannot clear registry with ${activePlugins.length} active plugins`,
      );
    }

    this.plugins.clear();
    this.pluginsByName.clear();
    this.errors.length = 0;
    this.warnings.length = 0;
  }

  public async updateStatus(
    pluginId: string,
    status: PluginStatus,
  ): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }

    const previousStatus = plugin.status;
    plugin.status = status;

    // Update timestamps based on status transitions
    if (
      status === PluginStatus.LOADED &&
      previousStatus !== PluginStatus.LOADED
    ) {
      plugin.loadedAt = new Date();
    }

    if (
      status === PluginStatus.ACTIVE &&
      previousStatus !== PluginStatus.ACTIVE
    ) {
      plugin.lastUsed = new Date();
    }
  }

  public async getStatus(pluginId: string): Promise<PluginStatus> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }
    return plugin.status;
  }

  public async validate(pluginId: string): Promise<PluginValidationResult> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }

    const result = await this.validator.validate(plugin);

    // Check duplicates against other plugins
    const duplicateCheck = await this.validator.checkDuplicates(
      plugin,
      Array.from(this.plugins.values()),
    );
    result.checks.duplicateId = duplicateCheck.duplicateId;
    result.checks.duplicateName = duplicateCheck.duplicateName;
    result.checks.duplicateCapabilities = duplicateCheck.duplicateCapabilities;

    return result;
  }

  public async validateAll(): Promise<Record<string, PluginValidationResult>> {
    const results: Record<string, PluginValidationResult> = {};

    for (const [pluginId] of this.plugins) {
      try {
        results[pluginId] = await this.validate(pluginId);
      } catch (error) {
        // Create a failed validation result
        results[pluginId] = {
          status: "invalid" as any,
          isValid: false,
          errors: [
            error instanceof Error ? error.message : "Unknown validation error",
          ],
          warnings: [],
          checks: {
            metadataValid: false,
            capabilitiesValid: false,
            factoryValid: false,
            configSchemaValid: false,
            dependenciesResolved: false,
            duplicateId: false,
            duplicateName: false,
            duplicateCapabilities: [],
          },
        };
      }
    }

    return results;
  }

  public async health(): Promise<PluginHealth> {
    const allPlugins = Array.from(this.plugins.values());
    const totalPlugins = allPlugins.length;

    // Count plugins by status
    const loadedPlugins = allPlugins.filter(
      (p) =>
        p.status === PluginStatus.LOADED || p.status === PluginStatus.ACTIVE,
    ).length;
    const activePlugins = allPlugins.filter(
      (p) => p.status === PluginStatus.ACTIVE,
    ).length;
    const failedPlugins = allPlugins.filter(
      (p) => p.status === PluginStatus.FAILED,
    ).length;

    // Calculate performance metrics
    const pluginsWithLoadTime = allPlugins.filter(
      (p) => p.loadTime !== undefined,
    );
    const averageLoadTime =
      pluginsWithLoadTime.length > 0
        ? pluginsWithLoadTime.reduce((sum, p) => sum + (p.loadTime || 0), 0) /
          pluginsWithLoadTime.length
        : 0;

    const totalUsageCount = allPlugins.reduce(
      (sum, p) => sum + p.usageCount,
      0,
    );

    // Collect recent errors and warnings
    const recentErrors: string[] = [];
    const recentWarnings: string[] = [];

    for (const plugin of allPlugins) {
      recentErrors.push(...plugin.errors);
      recentWarnings.push(...plugin.warnings);
    }

    // Add registry-level errors and warnings
    recentErrors.push(...this.errors);
    recentWarnings.push(...this.warnings);

    // Determine health status
    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (failedPlugins > 0 || recentErrors.length > 0) {
      status = "unhealthy";
    } else if (
      recentWarnings.length > 0 ||
      (totalPlugins > 0 && activePlugins === 0)
    ) {
      status = "degraded";
    }

    return {
      status,
      totalPlugins,
      loadedPlugins,
      activePlugins,
      failedPlugins,
      averageLoadTime,
      totalUsageCount,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
      recentWarnings: recentWarnings.slice(-10), // Last 10 warnings
      memoryUsage: 0, // Placeholder - would calculate actual memory usage
      diskUsage: 0, // Placeholder - would calculate actual disk usage
      metadata: {
        registrySize: totalPlugins,
        uniqueNames: this.pluginsByName.size,
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
      },
    };
  }

  public async getUsageStats(
    pluginId: string,
  ): Promise<{
    usageCount: number;
    lastUsed?: Date;
    averageLoadTime?: number;
  }> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }

    return {
      usageCount: plugin.usageCount,
      lastUsed: plugin.lastUsed,
      averageLoadTime: plugin.loadTime,
    };
  }

  public async incrementUsage(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }

    plugin.usageCount++;
    plugin.lastUsed = new Date();
  }
}
