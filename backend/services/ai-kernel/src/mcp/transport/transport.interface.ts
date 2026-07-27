import { MCPServerHealth } from "../types";

export interface MCPTransportMessage {
  id: string;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  jsonrpc: "2.0";
}

export interface MCPTransportConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface MCPTransport {
  readonly id: string;
  readonly type: string;
  readonly connected: boolean;

  connect(config: MCPTransportConfig): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPTransportMessage): Promise<void>;
  request(method: string, params?: any, timeout?: number): Promise<any>;
  stream(method: string, params?: any): AsyncIterable<any>;
  health(): Promise<MCPServerHealth>;
  close(): Promise<void>;

  on(event: "message", listener: (message: MCPTransportMessage) => void): void;
  on(event: "error", listener: (error: Error) => void): void;
  on(event: "disconnect", listener: () => void): void;
  on(event: "connect", listener: () => void): void;
  off(event: string, listener: Function): void;
}
