import { MCPTransport, MCPTransportConfig } from "./transport.interface";
import { HTTPTransport } from "./http.transport";
import { STDIOTransport } from "./stdio.transport";
import { SSETransport } from "./sse.transport";
import { MCPTransportType } from "../types";

export interface TransportFactoryConfig {
  type: MCPTransportType;
  id: string;
  config: MCPTransportConfig;
}

export class TransportFactory {
  static create(factoryConfig: TransportFactoryConfig): MCPTransport {
    const { type, id, config } = factoryConfig;

    switch (type) {
      case MCPTransportType.HTTP:
        return new HTTPTransport(id);

      case MCPTransportType.STDIO:
        return new STDIOTransport(id);

      case MCPTransportType.WEBSOCKET:
        // Future implementation - placeholder for extensibility
        throw new Error("WebSocket transport not yet implemented");

      case MCPTransportType.IPC:
        // Future implementation - placeholder for extensibility  
        throw new Error("IPC transport not yet implemented");

      default:
        // Handle SSE case (not in enum but supported)
        if (type === "sse" as any) {
          return new SSETransport(id);
        }
        throw new Error(`Unsupported transport type: ${type}`);
    }
  }

  static async createAndConnect(factoryConfig: TransportFactoryConfig): Promise<MCPTransport> {
    const transport = this.create(factoryConfig);
    await transport.connect(factoryConfig.config);
    return transport;
  }

  static getSupportedTypes(): string[] {
    return [
      MCPTransportType.HTTP,
      MCPTransportType.STDIO,
      "sse" // SSE support (not in original enum but implemented)
      // MCPTransportType.WEBSOCKET, // Future
      // MCPTransportType.IPC, // Future
    ];
  }

  static isTypeSupported(type: string): boolean {
    return this.getSupportedTypes().includes(type);
  }

  static validateConfig(type: MCPTransportType | string, config: MCPTransportConfig): void {
    switch (type) {
      case MCPTransportType.HTTP:
      case "sse":
        if (!config.baseURL) {
          throw new Error(`${type} transport requires baseURL in config`);
        }
        break;

      case MCPTransportType.STDIO:
        if (!config.command) {
          throw new Error("STDIO transport requires command in config");
        }
        break;

      case MCPTransportType.WEBSOCKET:
        throw new Error("WebSocket transport validation not yet implemented");

      case MCPTransportType.IPC:
        throw new Error("IPC transport validation not yet implemented");

      default:
        throw new Error(`Unknown transport type for validation: ${type}`);
    }
  }
}