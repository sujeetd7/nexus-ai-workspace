import { EventEmitter } from "events";
import { ITool } from "../../tools/interfaces/tool.interface";
import { MCPManager } from "../manager";
import { MCPSecurityManager } from "../security";
import { MCPServerRegistry, RegisteredServer } from "../registry/mcp-server-registry";
import { MCPToolBridge } from "./mcp-tool-bridge";
import { DuplicateToolException } from "../registry/exceptions";

export interface BridgedToolInfo {
  bridge: MCPToolBridge;
  serverId: string;
  toolName: string;
  createdAt: Date;
}

export class ToolBridgeFactory extends EventEmitter {
  private bridges = new Map<string, BridgedToolInfo>(); // toolName -> BridgedToolInfo
  private mcpManager: MCPManager;
  private securityManager: MCPSecurityManager;
  private registry: MCPServerRegistry;

  constructor(
    mcpManager: MCPManager,
    securityManager: MCPSecurityManager,
    registry: MCPServerRegistry
  ) {
    super();
    this.mcpManager = mcpManager;
    this.securityManager = securityManager;
    this.registry = registry;
    this.setupRegistryListeners();
  }

  createBridgesForServer(serverId: string): ITool[] {
    const server = this.registry.findServer(serverId);
    if (!server || server.status !== "active") {
      return [];
    }

    const bridges: ITool[] = [];
    const errors: Array<{ toolName: string; error: Error }> = [];

    for (const tool of server.tools) {
      try {
        const bridge = this.createBridge(tool, serverId, server);
        bridges.push(bridge);
      } catch (error) {
        errors.push({
          toolName: tool.name,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    if (errors.length > 0) {
      this.emit("bridge:errors", { serverId, errors });
    }

    if (bridges.length > 0) {
      this.emit("bridge:created", { serverId, count: bridges.length });
    }

    return bridges;
  }

  createBridgeForTool(toolName: string, serverId: string): ITool | null {
    const server = this.registry.findServer(serverId);
    if (!server || server.status !== "active") {
      return null;
    }

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      return null;
    }

    try {
      return this.createBridge(tool, serverId, server);
    } catch (error) {
      this.emit("bridge:error", { toolName, serverId, error });
      return null;
    }
  }

  refreshBridges(): ITool[] {
    // Clear existing bridges
    this.bridges.clear();

    // Create bridges for all active servers
    const allBridges: ITool[] = [];
    const activeServers = this.registry.listActiveServers();

    for (const server of activeServers) {
      const serverBridges = this.createBridgesForServer(server.server.id);
      allBridges.push(...serverBridges);
    }

    this.emit("bridge:refreshed", { totalBridges: allBridges.length });
    return allBridges;
  }

  getBridge(toolName: string): MCPToolBridge | null {
    const bridgedTool = this.bridges.get(toolName);
    return bridgedTool?.bridge || null;
  }

  getAllBridges(): MCPToolBridge[] {
    return Array.from(this.bridges.values()).map(info => info.bridge);
  }

  getBridgesForServer(serverId: string): MCPToolBridge[] {
    return Array.from(this.bridges.values())
      .filter(info => info.serverId === serverId)
      .map(info => info.bridge);
  }

  removeBridge(toolName: string): boolean {
    const removed = this.bridges.delete(toolName);
    if (removed) {
      this.emit("bridge:removed", { toolName });
    }
    return removed;
  }

  removeBridgesForServer(serverId: string): number {
    let count = 0;
    const toRemove: string[] = [];

    for (const [toolName, info] of this.bridges.entries()) {
      if (info.serverId === serverId) {
        toRemove.push(toolName);
        count++;
      }
    }

    toRemove.forEach(toolName => {
      this.bridges.delete(toolName);
    });

    if (count > 0) {
      this.emit("bridge:server_removed", { serverId, count });
    }

    return count;
  }

  getBridgeStats() {
    const stats = {
      totalBridges: this.bridges.size,
      bridgesByServer: {} as Record<string, number>,
      oldestBridge: undefined as Date | undefined,
      newestBridge: undefined as Date | undefined
    };

    for (const info of this.bridges.values()) {
      // Count by server
      stats.bridgesByServer[info.serverId] = (stats.bridgesByServer[info.serverId] || 0) + 1;

      // Track oldest/newest
      if (!stats.oldestBridge || info.createdAt < stats.oldestBridge) {
        stats.oldestBridge = info.createdAt;
      }
      if (!stats.newestBridge || info.createdAt > stats.newestBridge) {
        stats.newestBridge = info.createdAt;
      }
    }

    return stats;
  }

  clear(): void {
    this.bridges.clear();
    this.emit("bridge:cleared");
  }

  private createBridge(
    tool: any,
    serverId: string,
    server: RegisteredServer
  ): MCPToolBridge {
    // Check for duplicate tool names
    if (this.bridges.has(tool.name)) {
      const existingInfo = this.bridges.get(tool.name)!;
      throw new DuplicateToolException(tool.name, existingInfo.serverId, serverId);
    }

    // Create the bridge
    const bridge = new MCPToolBridge(
      tool,
      serverId,
      this.mcpManager,
      this.securityManager,
      this.registry
    );

    // Store bridge info
    const bridgeInfo: BridgedToolInfo = {
      bridge,
      serverId,
      toolName: tool.name,
      createdAt: new Date()
    };

    this.bridges.set(tool.name, bridgeInfo);

    this.emit("bridge:tool_created", {
      toolName: tool.name,
      serverId,
      bridge
    });

    return bridge;
  }

  private setupRegistryListeners(): void {
    // Auto-refresh bridges when servers are refreshed
    this.registry.on("server:refreshed", ({ serverId }: any) => {
      // Remove existing bridges for this server
      this.removeBridgesForServer(serverId);
      
      // Create new bridges
      const newBridges = this.createBridgesForServer(serverId);
      
      this.emit("bridge:server_refreshed", {
        serverId,
        bridgeCount: newBridges.length
      });
    });

    // Remove bridges when server is removed
    this.registry.on("server:removed", ({ serverId }: any) => {
      const removed = this.removeBridgesForServer(serverId);
      this.emit("bridge:server_removed", { serverId, count: removed });
    });

    // Handle server errors
    this.registry.on("server:error", ({ serverId }: any) => {
      // Keep bridges but mark them as potentially stale
      const bridges = this.getBridgesForServer(serverId);
      this.emit("bridge:server_error", {
        serverId,
        affectedBridges: bridges.length
      });
    });
  }
}