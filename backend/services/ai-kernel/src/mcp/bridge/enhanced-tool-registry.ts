import { EventEmitter } from "events";
import { ITool } from "../../tools/interfaces/tool.interface";
import { ToolRegistry } from "../../tools/registry/tool-registry";
import { MCPManager } from "../manager";
import { MCPSecurityManager } from "../security";
import { MCPServerRegistry } from "../registry/mcp-server-registry";
import { ToolBridgeFactory } from "./tool-bridge-factory";
import { DuplicateToolException } from "../registry/exceptions";

export interface ToolSource {
  type: "builtin" | "mcp";
  source?: string; // server ID for MCP tools
}

export interface EnhancedToolMetadata {
  id: string;
  name: string;
  version: string;
  category: string;
  enabled: boolean;
  description: string;
  tags: string[];
  source: ToolSource;
  registeredAt: Date;
}

export class EnhancedToolRegistry extends EventEmitter {
  private builtinRegistry: ToolRegistry;
  private mcpRegistry: MCPServerRegistry;
  private bridgeFactory: ToolBridgeFactory;
  private toolSources = new Map<string, ToolSource>(); // toolName -> source info

  constructor(
    builtinRegistry: ToolRegistry,
    mcpManager: MCPManager,
    securityManager: MCPSecurityManager,
    mcpRegistry: MCPServerRegistry,
  ) {
    super();
    this.builtinRegistry = builtinRegistry;
    this.mcpRegistry = mcpRegistry;
    this.bridgeFactory = new ToolBridgeFactory(
      mcpManager,
      securityManager,
      mcpRegistry,
    );
    this.setupEventListeners();
  }

  // Built-in tool methods
  registerBuiltInTool(tool: ITool): void {
    if (this.exists(tool.name)) {
      const existingSource = this.toolSources.get(tool.name);
      if (existingSource?.type === "mcp") {
        throw new DuplicateToolException(
          tool.name,
          existingSource.source || "unknown",
          "builtin",
        );
      }
      // Allow overwriting existing built-in tools
    }

    this.builtinRegistry.register(tool);
    this.toolSources.set(tool.name, { type: "builtin" });

    this.emit("tool:registered", {
      name: tool.name,
      type: "builtin",
      tool,
    });
  }

  registerBuiltInTools(tools: ITool[]): void {
    const errors: Array<{ tool: ITool; error: Error }> = [];

    for (const tool of tools) {
      try {
        this.registerBuiltInTool(tool);
      } catch (error) {
        errors.push({
          tool,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }

    if (errors.length > 0) {
      this.emit("tools:registration_errors", { errors });
    }

    this.emit("tools:builtin_registered", {
      successful: tools.length - errors.length,
      errors: errors.length,
    });
  }

  // MCP tool methods
  registerMCPTools(serverId: string): number {
    try {
      // Remove any existing MCP tools from this server first
      this.removeMCPToolsFromServer(serverId);

      // Create bridges for all tools from this server
      const bridges = this.bridgeFactory.createBridgesForServer(serverId);
      let registered = 0;

      for (const bridge of bridges) {
        try {
          // Check for conflicts with built-in tools
          if (this.builtinRegistry.exists(bridge.name)) {
            throw new DuplicateToolException(bridge.name, "builtin", serverId);
          }

          // Register the bridged tool
          this.builtinRegistry.register(bridge);
          this.toolSources.set(bridge.name, { type: "mcp", source: serverId });
          registered++;

          this.emit("tool:registered", {
            name: bridge.name,
            type: "mcp",
            serverId,
            tool: bridge,
          });
        } catch (error) {
          this.emit("tool:registration_error", {
            name: bridge.name,
            serverId,
            error,
          });
        }
      }

      this.emit("tools:mcp_registered", { serverId, count: registered });
      return registered;
    } catch (error) {
      this.emit("tools:mcp_registration_failed", { serverId, error });
      return 0;
    }
  }

  refreshMCPTools(serverId?: string): number {
    if (serverId) {
      // Refresh tools from a specific server
      return this.registerMCPTools(serverId);
    } else {
      // Refresh all MCP tools
      let totalRegistered = 0;
      const activeServers = this.mcpRegistry.listActiveServers();

      for (const server of activeServers) {
        totalRegistered += this.registerMCPTools(server.server.id);
      }

      this.emit("tools:all_mcp_refreshed", { totalRegistered });
      return totalRegistered;
    }
  }

  // Unified tool access methods
  findTool(name: string): ITool | null {
    return this.builtinRegistry.get(name) || null;
  }

  exists(name: string): boolean {
    return this.builtinRegistry.exists(name);
  }

  listTools(): ITool[] {
    return this.builtinRegistry.getAll();
  }

  listBuiltInTools(): ITool[] {
    return this.builtinRegistry.getAll().filter((tool) => {
      const source = this.toolSources.get(tool.name);
      return source?.type === "builtin" || !source; // Default to builtin if no source info
    });
  }

  listMCPTools(): ITool[] {
    return this.builtinRegistry.getAll().filter((tool) => {
      const source = this.toolSources.get(tool.name);
      return source?.type === "mcp";
    });
  }

  listMCPToolsFromServer(serverId: string): ITool[] {
    return this.builtinRegistry.getAll().filter((tool) => {
      const source = this.toolSources.get(tool.name);
      return source?.type === "mcp" && source.source === serverId;
    });
  }

  // Tool metadata and definitions (compatible with existing interface)
  metadata(): EnhancedToolMetadata[] {
    const baseMetadata = this.builtinRegistry.metadata();

    return baseMetadata.map((meta) => {
      const source = this.toolSources.get(meta.name) || { type: "builtin" };
      return {
        ...meta,
        source,
        registeredAt: new Date(), // Could be tracked more precisely if needed
      } as EnhancedToolMetadata;
    });
  }

  definitions() {
    return this.builtinRegistry.definitions();
  }

  // Tool removal methods
  unregisterTool(name: string): boolean {
    const removed = this.builtinRegistry.exists(name);
    if (removed) {
      this.builtinRegistry.unregister(name);
      const source = this.toolSources.get(name);
      this.toolSources.delete(name);

      this.emit("tool:unregistered", { name, source });
    }
    return removed;
  }

  removeMCPToolsFromServer(serverId: string): number {
    let removed = 0;
    const toolsToRemove: string[] = [];

    for (const [toolName, source] of this.toolSources.entries()) {
      if (source.type === "mcp" && source.source === serverId) {
        toolsToRemove.push(toolName);
      }
    }

    for (const toolName of toolsToRemove) {
      if (this.unregisterTool(toolName)) {
        removed++;
      }
    }

    // Also remove bridges
    this.bridgeFactory.removeBridgesForServer(serverId);

    if (removed > 0) {
      this.emit("tools:server_removed", { serverId, count: removed });
    }

    return removed;
  }

  // Statistics and health
  getRegistryStats() {
    const stats = {
      totalTools: this.builtinRegistry.getAll().length,
      builtinTools: 0,
      mcpTools: 0,
      toolsByServer: {} as Record<string, number>,
      bridgeStats: this.bridgeFactory.getBridgeStats(),
    };

    for (const [toolName, source] of this.toolSources.entries()) {
      if (source.type === "builtin") {
        stats.builtinTools++;
      } else if (source.type === "mcp") {
        stats.mcpTools++;
        const serverId = source.source || "unknown";
        stats.toolsByServer[serverId] =
          (stats.toolsByServer[serverId] || 0) + 1;
      }
    }

    return stats;
  }

  // Get tool source information
  getToolSource(name: string): ToolSource | null {
    return this.toolSources.get(name) || null;
  }

  // Bridge access for advanced use cases
  getBridgeFactory(): ToolBridgeFactory {
    return this.bridgeFactory;
  }

  // Cleanup
  clear(): void {
    // Don't clear built-in registry as it may be used elsewhere
    this.toolSources.clear();
    this.bridgeFactory.clear();
    this.emit("registry:cleared");
  }

  private setupEventListeners(): void {
    // Listen to MCP registry events
    this.mcpRegistry.on("server:refreshed", ({ serverId }: any) => {
      this.refreshMCPTools(serverId);
    });

    this.mcpRegistry.on("server:removed", ({ serverId }: any) => {
      this.removeMCPToolsFromServer(serverId);
    });

    this.mcpRegistry.on("server:error", ({ serverId }: any) => {
      // Optionally remove tools from errored servers
      // For now, keep them but emit a warning
      this.emit("tools:server_error", { serverId });
    });

    // Listen to bridge factory events
    this.bridgeFactory.on("bridge:errors", ({ serverId, errors }: any) => {
      this.emit("tools:bridge_errors", { serverId, errors });
    });

    this.bridgeFactory.on(
      "bridge:tool_created",
      ({ toolName, serverId }: any) => {
        this.emit("tools:bridge_created", { toolName, serverId });
      },
    );
  }
}
