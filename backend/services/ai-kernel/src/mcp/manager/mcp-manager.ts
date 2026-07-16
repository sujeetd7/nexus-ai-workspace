import { MCPServer, MCPTool } from "../interfaces";
import { MCPExecutionResult, MCPServerHealth } from "../types";
import { MCPRegistry } from "../registry";

export class MCPManager {
  private registry: MCPRegistry;

  constructor() {
    this.registry = new MCPRegistry();
  }

  async connect(server: MCPServer): Promise<void> {
    try {
      await server.connect();
      this.registry.registerServer(server);
    } catch (error) {
      throw new Error(`Failed to connect to server ${server.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const server = this.registry.findServer(serverId);
    if (!server) {
      throw new Error(`Server with id ${serverId} not found`);
    }

    try {
      await server.disconnect();
    } finally {
      this.registry.removeServer(serverId);
    }
  }

  async health(serverId?: string): Promise<MCPServerHealth | Record<string, MCPServerHealth>> {
    if (serverId) {
      const server = this.registry.findServer(serverId);
      if (!server) {
        throw new Error(`Server with id ${serverId} not found`);
      }

      try {
        return await server.health();
      } catch (error) {
        throw new Error(`Health check failed for server ${serverId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const servers = this.registry.listServers();
    const healthResults: Record<string, MCPServerHealth> = {};

    const healthChecks = servers.map(async (server) => {
      try {
        const health = await server.health();
        healthResults[server.id] = health;
      } catch (error) {
        healthResults[server.id] = {
          status: "unhealthy",
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    await Promise.allSettled(healthChecks);
    return healthResults;
  }

  async executeTool(serverId: string, toolName: string, parameters: any): Promise<MCPExecutionResult> {
    const server = this.registry.findServer(serverId);
    if (!server) {
      return {
        success: false,
        error: {
          code: "SERVER_NOT_FOUND",
          message: `Server with id ${serverId} not found`
        }
      };
    }

    try {
      const health = await server.health();
      if (health.status !== "healthy") {
        return {
          success: false,
          error: {
            code: "SERVER_UNHEALTHY",
            message: `Server ${serverId} is not healthy: ${health.error || 'Unknown health issue'}`
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "HEALTH_CHECK_FAILED",
          message: `Health check failed for server ${serverId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }

    const startTime = Date.now();
    try {
      const result = await server.executeTool(toolName, parameters);
      
      if (result.metadata) {
        result.metadata.executionTime = Date.now() - startTime;
        result.metadata.serverId = serverId;
        result.metadata.toolName = toolName;
        result.metadata.timestamp = new Date();
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "EXECUTION_FAILED",
          message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: error
        },
        metadata: {
          executionTime: Date.now() - startTime,
          serverId,
          toolName,
          timestamp: new Date()
        }
      };
    }
  }

  listServers(): MCPServer[] {
    return this.registry.listServers();
  }

  async listTools(serverId?: string): Promise<Array<{ server: MCPServer; tools: MCPTool[] }>> {
    if (serverId) {
      const server = this.registry.findServer(serverId);
      if (!server) {
        throw new Error(`Server with id ${serverId} not found`);
      }

      try {
        const tools = await server.listTools();
        return [{ server, tools }];
      } catch (error) {
        throw new Error(`Failed to list tools for server ${serverId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return this.registry.listTools();
  }

  async findTool(toolName: string): Promise<Array<{ server: MCPServer; tool: MCPTool }>> {
    return this.registry.findTool(toolName);
  }

  getServer(serverId: string): MCPServer | null {
    return this.registry.findServer(serverId);
  }

  async refresh(): Promise<void> {
    await this.registry.refresh();
  }

  getRegistry(): MCPRegistry {
    return this.registry;
  }
}