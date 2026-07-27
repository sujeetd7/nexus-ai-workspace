import { MCPServer, MCPTool } from "../interfaces";

export interface ServerInfo {
  server: MCPServer;
  registeredAt: Date;
  lastActivity: Date;
}

export class MCPRegistry {
  private servers = new Map<string, ServerInfo>();

  registerServer(server: MCPServer): void {
    const now = new Date();
    this.servers.set(server.id, {
      server,
      registeredAt: now,
      lastActivity: now,
    });
  }

  removeServer(serverId: string): boolean {
    return this.servers.delete(serverId);
  }

  findServer(serverId: string): MCPServer | null {
    const serverInfo = this.servers.get(serverId);
    if (serverInfo) {
      serverInfo.lastActivity = new Date();
      return serverInfo.server;
    }
    return null;
  }

  async findTool(
    toolName: string,
  ): Promise<Array<{ server: MCPServer; tool: MCPTool }>> {
    const results: Array<{ server: MCPServer; tool: MCPTool }> = [];

    const serverInfos = Array.from(this.servers.values());
    for (const serverInfo of serverInfos) {
      try {
        const tools = await serverInfo.server.listTools();
        const matchingTool = tools.find((tool) => tool.name === toolName);
        if (matchingTool) {
          results.push({
            server: serverInfo.server,
            tool: matchingTool,
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  listServers(): MCPServer[] {
    return Array.from(this.servers.values()).map((info) => info.server);
  }

  async listTools(): Promise<Array<{ server: MCPServer; tools: MCPTool[] }>> {
    const results: Array<{ server: MCPServer; tools: MCPTool[] }> = [];

    const serverInfos = Array.from(this.servers.values());
    for (const serverInfo of serverInfos) {
      try {
        const tools = await serverInfo.server.listTools();
        results.push({
          server: serverInfo.server,
          tools,
        });
      } catch (error) {
        results.push({
          server: serverInfo.server,
          tools: [],
        });
      }
    }

    return results;
  }

  async refresh(): Promise<void> {
    const healthChecks = Array.from(this.servers.values()).map(
      async (serverInfo) => {
        try {
          await serverInfo.server.health();
          serverInfo.lastActivity = new Date();
        } catch (error) {
          // Server health check failed, but we don't remove it
          // The manager can decide what to do with unhealthy servers
        }
      },
    );

    await Promise.allSettled(healthChecks);
  }

  getServerInfo(serverId: string): ServerInfo | null {
    return this.servers.get(serverId) || null;
  }

  clear(): void {
    this.servers.clear();
  }

  size(): number {
    return this.servers.size;
  }
}
