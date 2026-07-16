import { MCPConnectionStatus, MCPTransportType, MCPServerHealth, MCPExecutionResult } from "../types";
import { MCPTool } from "./mcp-tool.interface";

export interface MCPServer {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly transport: MCPTransportType;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  health(): Promise<MCPServerHealth>;
  listTools(): Promise<MCPTool[]>;
  executeTool(toolName: string, parameters: any): Promise<MCPExecutionResult>;
}