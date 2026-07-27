import { EventEmitter } from "events";
import {
  MCPTransport,
  MCPTransportConfig,
  MCPTransportMessage,
} from "./transport.interface";
import { MCPServerHealth } from "../types";

export abstract class BaseTransport
  extends EventEmitter
  implements MCPTransport
{
  public readonly id: string;
  public readonly type: string;
  protected _connected: boolean = false;
  protected requestId: number = 0;
  protected pendingRequests = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  constructor(id: string, type: string) {
    super();
    this.id = id;
    this.type = type;
  }

  get connected(): boolean {
    return this._connected;
  }

  protected generateRequestId(): string {
    return `${this.id}-${++this.requestId}-${Date.now()}`;
  }

  protected handleMessage(message: MCPTransportMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      clearTimeout(pending.timeout);

      if (message.error) {
        pending.reject(
          new Error(`${message.error.code}: ${message.error.message}`),
        );
      } else {
        pending.resolve(message.result);
      }
    } else {
      this.emit("message", message);
    }
  }

  protected handleError(error: Error): void {
    this.emit("error", error);
  }

  protected handleDisconnect(): void {
    this._connected = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Transport disconnected"));
    }
    this.pendingRequests.clear();

    this.emit("disconnect");
  }

  protected handleConnect(): void {
    this._connected = true;
    this.emit("connect");
  }

  async request(
    method: string,
    params?: any,
    timeout: number = 30000,
  ): Promise<any> {
    if (!this._connected) {
      throw new Error("Transport not connected");
    }

    const id = this.generateRequestId();
    const message: MCPTransportMessage = {
      id,
      method,
      params,
      jsonrpc: "2.0",
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeout);

      this.pendingRequests.set(id, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });

      this.send(message).catch(reject);
    });
  }

  async health(): Promise<MCPServerHealth> {
    const startTime = Date.now();
    try {
      await this.request("health", {}, 5000);
      return {
        status: "healthy",
        latency: Date.now() - startTime,
        lastCheck: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  abstract connect(config: MCPTransportConfig): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: MCPTransportMessage): Promise<void>;
  abstract stream(method: string, params?: any): AsyncIterable<any>;
  abstract close(): Promise<void>;
}
