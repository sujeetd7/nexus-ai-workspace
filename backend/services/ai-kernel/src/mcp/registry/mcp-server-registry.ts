import { EventEmitter } from "events";
import { MCPSessionManager } from "../sessions";
import { DiscoveryManager } from "../discovery";
import { MCPServer } from "../interfaces";
import {
  MCPDiscoveredTool,
  MCPDiscoveredPrompt,
  MCPDiscoveredResource,
  MCPDiscoveredTemplate,
  MCPServerCapabilities
} from "../discovery";
import { DuplicateToolException, ServerRegistrationException } from "./exceptions";

export interface RegisteredServer {
  server: MCPServer;
  registeredAt: Date;
  lastRefresh: Date;
  capabilities?: MCPServerCapabilities;
  tools: MCPDiscoveredTool[];
  prompts: MCPDiscoveredPrompt[];
  resources: MCPDiscoveredResource[];
  templates: MCPDiscoveredTemplate[];
  status: "active" | "inactive" | "error";
  errorMessage?: string;
}

export interface ServerLookupResult {
  serverId: string;
  server: RegisteredServer;
  item: MCPDiscoveredTool | MCPDiscoveredPrompt | MCPDiscoveredResource | MCPDiscoveredTemplate;
}

export class MCPServerRegistry extends EventEmitter {
  private servers = new Map<string, RegisteredServer>();
  private toolIndex = new Map<string, string>(); // toolName -> serverId
  private sessionManager: MCPSessionManager;
  private discoveryManager: DiscoveryManager;

  constructor(sessionManager: MCPSessionManager, discoveryManager: DiscoveryManager) {
    super();
    this.sessionManager = sessionManager;
    this.discoveryManager = discoveryManager;
    this.setupEventListeners();
  }

  async registerServer(server: MCPServer): Promise<RegisteredServer> {
    const serverId = server.id;

    if (this.servers.has(serverId)) {
      throw new ServerRegistrationException(
        serverId,
        "register",
        "Server already registered"
      );
    }

    const registeredServer: RegisteredServer = {
      server,
      registeredAt: new Date(),
      lastRefresh: new Date(),
      tools: [],
      prompts: [],
      resources: [],
      templates: [],
      status: "inactive"
    };

    this.servers.set(serverId, registeredServer);

    try {
      await this.refreshServer(serverId);
      this.emit("server:registered", { serverId, server: registeredServer });
      return registeredServer;
    } catch (error) {
      // Remove from registry if refresh fails during initial registration
      this.servers.delete(serverId);
      throw new ServerRegistrationException(
        serverId,
        "register",
        error instanceof Error ? error.message : "Unknown error",
        error instanceof Error ? error : undefined
      );
    }
  }

  removeServer(serverId: string): boolean {
    const registeredServer = this.servers.get(serverId);
    if (!registeredServer) {
      return false;
    }

    // Remove all tools from index
    registeredServer.tools.forEach(tool => {
      this.toolIndex.delete(tool.name);
    });

    const removed = this.servers.delete(serverId);
    if (removed) {
      this.emit("server:removed", { serverId, server: registeredServer });
    }

    return removed;
  }

  async refreshServer(serverId: string): Promise<RegisteredServer> {
    const registeredServer = this.servers.get(serverId);
    if (!registeredServer) {
      throw new ServerRegistrationException(
        serverId,
        "refresh",
        "Server not found in registry"
      );
    }

    try {
      // Use discovery manager to get all server data
      const discoveryResult = await this.discoveryManager.discoverServer(serverId, true);

      // Update server data
      registeredServer.lastRefresh = new Date();
      registeredServer.status = "active";
      registeredServer.errorMessage = undefined;

      // Update capabilities
      if (discoveryResult.capabilities.success && discoveryResult.capabilities.data) {
        registeredServer.capabilities = discoveryResult.capabilities.data[0];
      }

      // Clear existing tool index entries for this server
      registeredServer.tools.forEach(tool => {
        this.toolIndex.delete(tool.name);
      });

      // Update tools and check for duplicates
      if (discoveryResult.tools.success && discoveryResult.tools.data) {
        registeredServer.tools = discoveryResult.tools.data;
        
        // Re-index tools and check for duplicates
        for (const tool of registeredServer.tools) {
          const existingServerId = this.toolIndex.get(tool.name);
          if (existingServerId && existingServerId !== serverId) {
            throw new DuplicateToolException(tool.name, existingServerId, serverId);
          }
          this.toolIndex.set(tool.name, serverId);
        }
      } else {
        registeredServer.tools = [];
      }

      // Update prompts
      if (discoveryResult.prompts.success && discoveryResult.prompts.data) {
        registeredServer.prompts = discoveryResult.prompts.data;
      } else {
        registeredServer.prompts = [];
      }

      // Update resources
      if (discoveryResult.resources.success && discoveryResult.resources.data) {
        registeredServer.resources = discoveryResult.resources.data;
      } else {
        registeredServer.resources = [];
      }

      // Update templates
      if (discoveryResult.templates.success && discoveryResult.templates.data) {
        registeredServer.templates = discoveryResult.templates.data;
      } else {
        registeredServer.templates = [];
      }

      this.emit("server:refreshed", { serverId, server: registeredServer });
      return registeredServer;

    } catch (error) {
      registeredServer.status = "error";
      registeredServer.errorMessage = error instanceof Error ? error.message : "Unknown error";
      registeredServer.lastRefresh = new Date();

      this.emit("server:error", { serverId, error: registeredServer.errorMessage });

      if (error instanceof DuplicateToolException || error instanceof ServerRegistrationException) {
        throw error;
      }

      throw new ServerRegistrationException(
        serverId,
        "refresh",
        error instanceof Error ? error.message : "Unknown error",
        error instanceof Error ? error : undefined
      );
    }
  }

  async refreshAll(): Promise<Map<string, RegisteredServer>> {
    const results = new Map<string, RegisteredServer>();
    const refreshPromises = Array.from(this.servers.keys()).map(async (serverId) => {
      try {
        const result = await this.refreshServer(serverId);
        results.set(serverId, result);
      } catch (error) {
        // Continue with other servers even if one fails
        const registeredServer = this.servers.get(serverId);
        if (registeredServer) {
          results.set(serverId, registeredServer);
        }
      }
    });

    await Promise.allSettled(refreshPromises);
    this.emit("registry:refreshed", { serverCount: results.size });
    return results;
  }

  findServer(serverId: string): RegisteredServer | null {
    return this.servers.get(serverId) || null;
  }

  findTool(toolName: string): ServerLookupResult | null {
    const serverId = this.toolIndex.get(toolName);
    if (!serverId) {
      return null;
    }

    const server = this.servers.get(serverId);
    if (!server) {
      // Clean up stale index entry
      this.toolIndex.delete(toolName);
      return null;
    }

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      // Clean up stale index entry
      this.toolIndex.delete(toolName);
      return null;
    }

    return {
      serverId,
      server,
      item: tool
    };
  }

  findPrompt(promptName: string): ServerLookupResult | null {
    for (const [serverId, server] of this.servers.entries()) {
      const prompt = server.prompts.find(p => p.name === promptName);
      if (prompt) {
        return {
          serverId,
          server,
          item: prompt
        };
      }
    }
    return null;
  }

  findResource(resourceUri: string): ServerLookupResult | null {
    for (const [serverId, server] of this.servers.entries()) {
      const resource = server.resources.find(r => r.uri === resourceUri);
      if (resource) {
        return {
          serverId,
          server,
          item: resource
        };
      }
    }
    return null;
  }

  findTemplate(templateName: string): ServerLookupResult | null {
    for (const [serverId, server] of this.servers.entries()) {
      const template = server.templates.find(t => t.name === templateName);
      if (template) {
        return {
          serverId,
          server,
          item: template
        };
      }
    }
    return null;
  }

  listServers(): RegisteredServer[] {
    return Array.from(this.servers.values());
  }

  listActiveServers(): RegisteredServer[] {
    return this.listServers().filter(server => server.status === "active");
  }

  listTools(): Array<{ serverId: string; tool: MCPDiscoveredTool }> {
    const tools: Array<{ serverId: string; tool: MCPDiscoveredTool }> = [];
    
    for (const [serverId, server] of this.servers.entries()) {
      if (server.status === "active") {
        server.tools.forEach(tool => {
          tools.push({ serverId, tool });
        });
      }
    }

    return tools;
  }

  listPrompts(): Array<{ serverId: string; prompt: MCPDiscoveredPrompt }> {
    const prompts: Array<{ serverId: string; prompt: MCPDiscoveredPrompt }> = [];
    
    for (const [serverId, server] of this.servers.entries()) {
      if (server.status === "active") {
        server.prompts.forEach(prompt => {
          prompts.push({ serverId, prompt });
        });
      }
    }

    return prompts;
  }

  listResources(): Array<{ serverId: string; resource: MCPDiscoveredResource }> {
    const resources: Array<{ serverId: string; resource: MCPDiscoveredResource }> = [];
    
    for (const [serverId, server] of this.servers.entries()) {
      if (server.status === "active") {
        server.resources.forEach(resource => {
          resources.push({ serverId, resource });
        });
      }
    }

    return resources;
  }

  listTemplates(): Array<{ serverId: string; template: MCPDiscoveredTemplate }> {
    const templates: Array<{ serverId: string; template: MCPDiscoveredTemplate }> = [];
    
    for (const [serverId, server] of this.servers.entries()) {
      if (server.status === "active") {
        server.templates.forEach(template => {
          templates.push({ serverId, template });
        });
      }
    }

    return templates;
  }

  getRegistryStats() {
    const stats = {
      totalServers: this.servers.size,
      activeServers: 0,
      inactiveServers: 0,
      errorServers: 0,
      totalTools: 0,
      totalPrompts: 0,
      totalResources: 0,
      totalTemplates: 0,
      toolIndex: this.toolIndex.size
    };

    for (const server of this.servers.values()) {
      switch (server.status) {
        case "active":
          stats.activeServers++;
          stats.totalTools += server.tools.length;
          stats.totalPrompts += server.prompts.length;
          stats.totalResources += server.resources.length;
          stats.totalTemplates += server.templates.length;
          break;
        case "inactive":
          stats.inactiveServers++;
          break;
        case "error":
          stats.errorServers++;
          break;
      }
    }

    return stats;
  }

  clear(): void {
    this.servers.clear();
    this.toolIndex.clear();
    this.emit("registry:cleared");
  }

  private setupEventListeners(): void {
    // Listen for discovery events
    this.discoveryManager.on("server:refreshed", async (payload: any) => {
      const serverId = payload.serverId;
      if (this.servers.has(serverId)) {
        // Server was refreshed by discovery manager, update our registry
        try {
          await this.refreshServer(serverId);
        } catch (error) {
          // Handle refresh errors
          this.emit("server:refresh_error", { serverId, error });
        }
      }
    });
  }
}