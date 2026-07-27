import { promises as fs } from "fs";
import { join, resolve, extname } from "path";
import {
  PluginDescriptor,
  PluginStatus,
  PluginExports,
  PluginDiscoveryOptions,
  PluginLoadOptions,
  PluginHealth,
} from "./plugin.types";
import {
  PluginException,
  PluginLoadException,
  PluginNotFoundException,
  InvalidPluginException,
  PluginStateException,
} from "./plugin.exceptions";
import { IPluginRegistry, PluginRegistry } from "./plugin-registry";
import { IPluginValidator, PluginValidator } from "./plugin-validator";
import { IAgentRegistry } from "../interfaces";

export interface IPluginLoader {
  discover(options: PluginDiscoveryOptions): Promise<PluginDescriptor[]>;
  load(
    pluginId: string,
    options?: PluginLoadOptions,
  ): Promise<PluginDescriptor>;
  unload(pluginId: string): Promise<boolean>;
  reload(
    pluginId: string,
    options?: PluginLoadOptions,
  ): Promise<PluginDescriptor>;
  validate(pluginId: string): Promise<boolean>;
  list(): Promise<PluginDescriptor[]>;
  health(): Promise<PluginHealth>;
}

export class PluginLoader implements IPluginLoader {
  private readonly pluginRegistry: IPluginRegistry;
  private readonly validator: IPluginValidator;
  private readonly agentRegistry?: IAgentRegistry;
  private readonly errors: string[] = [];
  private readonly warnings: string[] = [];

  constructor(agentRegistry?: IAgentRegistry) {
    this.pluginRegistry = new PluginRegistry();
    this.validator = new PluginValidator();
    this.agentRegistry = agentRegistry;
  }

  public async discover(
    options: PluginDiscoveryOptions,
  ): Promise<PluginDescriptor[]> {
    const discoveredPlugins: PluginDescriptor[] = [];

    for (const searchPath of options.searchPaths) {
      try {
        const plugins = await this.discoverInPath(searchPath, options);
        discoveredPlugins.push(...plugins);
      } catch (error) {
        const errorMsg = `Failed to discover plugins in path '${searchPath}': ${error instanceof Error ? error.message : "Unknown error"}`;
        this.errors.push(errorMsg);

        if (options.validateOnDiscovery) {
          throw new PluginException("discover", undefined, errorMsg);
        }
      }
    }

    // Register discovered plugins
    for (const plugin of discoveredPlugins) {
      try {
        await this.pluginRegistry.register(plugin);
      } catch (error) {
        const errorMsg = `Failed to register discovered plugin '${plugin.id}': ${error instanceof Error ? error.message : "Unknown error"}`;
        this.errors.push(errorMsg);

        if (options.validateOnDiscovery) {
          throw new PluginException("register", plugin.id, errorMsg);
        }
      }
    }

    return discoveredPlugins;
  }

  public async load(
    pluginId: string,
    options: PluginLoadOptions = {},
  ): Promise<PluginDescriptor> {
    const plugin = await this.pluginRegistry.find(pluginId);
    if (!plugin) {
      throw new PluginNotFoundException(pluginId);
    }

    // Check if plugin is already loaded
    if (
      plugin.status === PluginStatus.LOADED ||
      plugin.status === PluginStatus.ACTIVE
    ) {
      if (!options.overwriteExisting) {
        throw new PluginStateException(
          pluginId,
          plugin.status,
          "unloaded",
          "Plugin is already loaded",
        );
      }

      // Unload first if overwrite is allowed
      await this.unload(pluginId);
    }

    try {
      const startTime = Date.now();

      // Update status to loading
      await this.pluginRegistry.updateStatus(pluginId, PluginStatus.LOADING);

      // Validate before loading if requested
      if (options.validateBeforeLoad !== false) {
        const validationResult = await this.validator.validate(plugin);
        if (!validationResult.isValid) {
          throw new InvalidPluginException(pluginId, validationResult.errors);
        }
      }

      // Load plugin exports
      const pluginExports = await this.loadPluginExports(plugin.sourcePath);

      // Update plugin with loaded data
      plugin.metadata = { ...plugin.metadata, ...pluginExports.metadata };
      plugin.capabilities = pluginExports.capabilities;
      plugin.factory = pluginExports.factory;
      plugin.loadTime = Date.now() - startTime;

      // Create agent instance if auto-register is enabled
      if (options.autoRegister !== false && this.agentRegistry) {
        try {
          const agentInstance = await plugin.factory.createAgent(
            options.config,
          );
          plugin.agentInstance = agentInstance;

          // Register agent with agent registry
          await this.agentRegistry.register(agentInstance);

          await this.pluginRegistry.updateStatus(pluginId, PluginStatus.ACTIVE);
        } catch (error) {
          await this.pluginRegistry.updateStatus(pluginId, PluginStatus.LOADED);
          this.warnings.push(
            `Plugin '${pluginId}' loaded but agent registration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      } else {
        await this.pluginRegistry.updateStatus(pluginId, PluginStatus.LOADED);
      }

      return plugin;
    } catch (error) {
      await this.pluginRegistry.updateStatus(pluginId, PluginStatus.FAILED);

      const errorMsg =
        error instanceof Error ? error.message : "Unknown loading error";
      plugin.errors.push(errorMsg);

      throw new PluginLoadException(pluginId, plugin.sourcePath, errorMsg);
    }
  }

  public async unload(pluginId: string): Promise<boolean> {
    const plugin = await this.pluginRegistry.find(pluginId);
    if (!plugin) {
      return false;
    }

    try {
      // Update status to unloading
      await this.pluginRegistry.updateStatus(pluginId, PluginStatus.UNLOADING);

      // Unregister agent if it was registered
      if (plugin.agentInstance && this.agentRegistry) {
        try {
          await this.agentRegistry.remove(plugin.agentInstance.metadata.id);
        } catch (error) {
          this.warnings.push(
            `Failed to unregister agent for plugin '${pluginId}': ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }

      // Clean up plugin instance
      plugin.agentInstance = undefined;

      // Update status to unloaded
      await this.pluginRegistry.updateStatus(pluginId, PluginStatus.UNLOADED);

      return true;
    } catch (error) {
      await this.pluginRegistry.updateStatus(pluginId, PluginStatus.FAILED);

      const errorMsg = `Failed to unload plugin '${pluginId}': ${error instanceof Error ? error.message : "Unknown error"}`;
      this.errors.push(errorMsg);
      plugin.errors.push(errorMsg);

      throw new PluginException("unload", pluginId, errorMsg);
    }
  }

  public async reload(
    pluginId: string,
    options: PluginLoadOptions = {},
  ): Promise<PluginDescriptor> {
    // Unload first
    await this.unload(pluginId);

    // Load again
    return await this.load(pluginId, options);
  }

  public async validate(pluginId: string): Promise<boolean> {
    const validationResult = await this.pluginRegistry.validate(pluginId);
    return validationResult.isValid;
  }

  public async list(): Promise<PluginDescriptor[]> {
    return await this.pluginRegistry.list();
  }

  public async health(): Promise<PluginHealth> {
    const registryHealth = await this.pluginRegistry.health();

    // Add loader-specific health information
    return {
      ...registryHealth,
      recentErrors: [...registryHealth.recentErrors, ...this.errors.slice(-5)],
      recentWarnings: [
        ...registryHealth.recentWarnings,
        ...this.warnings.slice(-5),
      ],
      metadata: {
        ...registryHealth.metadata,
        loaderErrors: this.errors.length,
        loaderWarnings: this.warnings.length,
      },
    };
  }

  private async discoverInPath(
    searchPath: string,
    options: PluginDiscoveryOptions,
    currentDepth: number = 0,
  ): Promise<PluginDescriptor[]> {
    const plugins: PluginDescriptor[] = [];

    // Check depth limit
    if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
      return plugins;
    }

    try {
      const resolvedPath = resolve(searchPath);
      const stat = await fs.stat(resolvedPath);

      if (stat.isFile()) {
        // Single file
        const plugin = await this.loadPluginFromFile(resolvedPath);
        if (plugin) {
          plugins.push(plugin);
        }
      } else if (stat.isDirectory()) {
        // Directory
        const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

        for (const entry of entries) {
          const entryPath = join(resolvedPath, entry.name);

          // Apply include/exclude patterns
          if (
            !this.matchesPatterns(
              entry.name,
              options.includePatterns,
              options.excludePatterns,
            )
          ) {
            continue;
          }

          if (entry.isFile()) {
            const plugin = await this.loadPluginFromFile(entryPath);
            if (plugin) {
              plugins.push(plugin);
            }
          } else if (entry.isDirectory() && options.recursive !== false) {
            // Recursive discovery
            const subPlugins = await this.discoverInPath(
              entryPath,
              options,
              currentDepth + 1,
            );
            plugins.push(...subPlugins);
          } else if (entry.isSymbolicLink() && options.followSymlinks) {
            // Follow symlinks if enabled
            const realPath = await fs.realpath(entryPath);
            const subPlugins = await this.discoverInPath(
              realPath,
              options,
              currentDepth + 1,
            );
            plugins.push(...subPlugins);
          }
        }
      }
    } catch (error) {
      this.warnings.push(
        `Failed to access path '${searchPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return plugins;
  }

  private async loadPluginFromFile(
    filePath: string,
  ): Promise<PluginDescriptor | null> {
    try {
      // Only load JavaScript/TypeScript files
      const ext = extname(filePath);
      if (![".js", ".mjs", ".ts"].includes(ext)) {
        return null;
      }

      // Dynamic import (simplified - in real implementation would handle compilation for .ts files)
      const pluginExports = await this.loadPluginExports(filePath);

      // Create plugin descriptor
      const plugin: PluginDescriptor = {
        id: pluginExports.metadata.id,
        name: pluginExports.metadata.name,
        version: pluginExports.metadata.version,
        status: PluginStatus.DISCOVERED,
        metadata: pluginExports.metadata,
        capabilities: pluginExports.capabilities,
        factory: pluginExports.factory,
        sourcePath: filePath,
        sourceType: "file",
        usageCount: 0,
        errors: [],
        warnings: [],
      };

      return plugin;
    } catch (error) {
      this.warnings.push(
        `Failed to load plugin from '${filePath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  private async loadPluginExports(filePath: string): Promise<PluginExports> {
    try {
      // Dynamic import
      const module = await import(filePath);

      // Check for required exports
      if (!module.metadata || !module.capabilities || !module.factory) {
        throw new Error(
          "Plugin must export metadata, capabilities, and factory",
        );
      }

      return {
        metadata: module.metadata,
        capabilities: module.capabilities,
        factory: module.factory,
      };
    } catch (error) {
      throw new Error(
        `Failed to load plugin exports: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private matchesPatterns(
    name: string,
    includePatterns?: string[],
    excludePatterns?: string[],
  ): boolean {
    // Check exclude patterns first
    if (excludePatterns && excludePatterns.length > 0) {
      for (const pattern of excludePatterns) {
        if (this.matchesPattern(name, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (includePatterns && includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        if (this.matchesPattern(name, pattern)) {
          return true;
        }
      }
      return false; // No include patterns matched
    }

    return true; // No patterns specified or only exclude patterns (which didn't match)
  }

  private matchesPattern(name: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return regex.test(name);
  }
}
