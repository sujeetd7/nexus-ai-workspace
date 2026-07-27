import { ITool } from "../../tools/interfaces/tool.interface";
import { MCPManager } from "../manager";
import { MCPSecurityManager } from "../security";
import { MCPDiscoveredTool } from "../discovery";
import { MCPServerRegistry } from "../registry/mcp-server-registry";

export interface MCPToolMetadata {
  serverId: string;
  originalTool: MCPDiscoveredTool;
  bridgedAt: Date;
}

export class MCPToolBridge implements ITool {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  public readonly version: string;
  public readonly enabled: boolean = true;
  public readonly category: "mcp" = "mcp";
  public readonly permissions: string[];
  public readonly tags: string[];
  public readonly inputSchema?: object;
  public readonly outputSchema?: object;
  public readonly timeout?: number;

  private mcpManager: MCPManager;
  private securityManager: MCPSecurityManager;
  private registry: MCPServerRegistry;
  private metadata: MCPToolMetadata;

  constructor(
    tool: MCPDiscoveredTool,
    serverId: string,
    mcpManager: MCPManager,
    securityManager: MCPSecurityManager,
    registry: MCPServerRegistry,
  ) {
    this.id = `mcp:${serverId}:${tool.name}`;
    this.name = tool.name;
    this.description = tool.description;
    this.version = tool.metadata?.version || "1.0.0";
    this.permissions = this.extractPermissions(tool);
    this.tags = tool.metadata?.tags || [];
    this.inputSchema = tool.inputSchema;
    this.outputSchema = this.generateOutputSchema(tool);
    this.timeout = 30000; // Default 30 seconds for MCP tools

    this.mcpManager = mcpManager;
    this.securityManager = securityManager;
    this.registry = registry;
    this.metadata = {
      serverId,
      originalTool: tool,
      bridgedAt: new Date(),
    };
  }

  async execute(input: any): Promise<any> {
    try {
      // Validate input against schema
      this.validateInput(input);

      // Get security context from input (if available)
      const securityContext = this.extractSecurityContext(input);

      if (securityContext) {
        // Authorize tool execution
        await this.securityManager.authorizeTool({
          context: securityContext,
          toolName: this.name,
          parameters: input,
        });
      }

      // Execute the tool via MCP Manager
      const result = await this.mcpManager.executeTool(
        this.metadata.serverId,
        this.name,
        input,
      );

      // Normalize the result
      return this.normalizeResult(result);
    } catch (error) {
      // Transform MCP errors into standard tool execution errors
      throw this.transformError(error);
    }
  }

  // Additional bridge-specific methods
  getServerId(): string {
    return this.metadata.serverId;
  }

  getOriginalTool(): MCPDiscoveredTool {
    return this.metadata.originalTool;
  }

  getBridgeMetadata(): MCPToolMetadata {
    return { ...this.metadata };
  }

  isServerActive(): boolean {
    const server = this.registry.findServer(this.metadata.serverId);
    return server?.status === "active";
  }

  async refreshFromServer(): Promise<void> {
    // Refresh the server registration to get latest tool metadata
    await this.registry.refreshServer(this.metadata.serverId);

    // Update our metadata with the latest tool information
    const serverLookup = this.registry.findTool(this.name);
    if (serverLookup && serverLookup.serverId === this.metadata.serverId) {
      this.metadata.originalTool = serverLookup.item as MCPDiscoveredTool;
    }
  }

  private validateInput(input: any): void {
    if (!this.inputSchema) {
      return; // No schema to validate against
    }

    // Basic validation - in a real implementation, you'd use a JSON schema validator
    const schema = this.inputSchema as any;
    if (schema.type === "object" && schema.required) {
      for (const requiredField of schema.required) {
        if (!(requiredField in input)) {
          throw new Error(`Missing required parameter: ${requiredField}`);
        }
      }
    }
  }

  private extractSecurityContext(input: any): any {
    // Extract security context from input if it exists
    // This would typically be passed by the execution framework
    return input?._security || input?.__context || null;
  }

  private normalizeResult(mcpResult: any): any {
    // Normalize MCP execution result to standard tool result format
    if (mcpResult.success) {
      return {
        success: true,
        data: mcpResult.data,
        metadata: {
          serverId: this.metadata.serverId,
          toolName: this.name,
          executedAt: new Date(),
          ...mcpResult.metadata,
        },
      };
    } else {
      throw new Error(mcpResult.error?.message || "MCP tool execution failed");
    }
  }

  private transformError(error: any): Error {
    if (error instanceof Error) {
      // Wrap MCP errors with tool execution context
      const toolError = new Error(
        `Tool '${this.name}' execution failed: ${error.message}`,
      );
      toolError.stack = error.stack;
      return toolError;
    }

    return new Error(`Tool '${this.name}' execution failed: ${String(error)}`);
  }

  private extractPermissions(tool: MCPDiscoveredTool): string[] {
    const permissions: string[] = [];

    // Extract permissions from metadata
    if (tool.metadata?.category) {
      permissions.push(`category:${tool.metadata.category}`);
    }

    // Add tool-specific permissions based on input schema
    const schema = tool.inputSchema;
    if (schema && schema.properties) {
      // Check for sensitive parameters that might require special permissions
      for (const [paramName, paramDef] of Object.entries(schema.properties)) {
        const def = paramDef as any;
        if (def.sensitive || def.permission) {
          permissions.push(`param:${paramName}`);
        }
      }
    }

    return permissions.length > 0 ? permissions : ["mcp:execute"];
  }

  private generateOutputSchema(tool: MCPDiscoveredTool): object {
    // Generate a basic output schema for MCP tools
    return {
      type: "object",
      properties: {
        success: {
          type: "boolean",
          description: "Whether the tool execution was successful",
        },
        data: {
          type: "object",
          description: "The tool execution result data",
          additionalProperties: true,
        },
        metadata: {
          type: "object",
          description: "Execution metadata",
          properties: {
            serverId: { type: "string" },
            toolName: { type: "string" },
            executedAt: { type: "string", format: "date-time" },
          },
        },
      },
      required: ["success"],
    };
  }
}
