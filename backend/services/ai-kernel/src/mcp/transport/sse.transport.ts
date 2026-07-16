import { BaseTransport } from "./base.transport";
import { MCPTransportConfig, MCPTransportMessage } from "./transport.interface";
import axios, { AxiosInstance } from "axios";

export interface SSETransportConfig extends MCPTransportConfig {
  baseURL: string;
  timeout?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export class SSETransport extends BaseTransport {
  private eventSource: EventSource | null = null;
  private httpClient: AxiosInstance | null = null;
  private config: SSETransportConfig | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(id: string) {
    super(id, "sse");
  }

  async connect(config: SSETransportConfig): Promise<void> {
    if (this._connected) {
      throw new Error("Already connected");
    }

    this.config = {
      timeout: 30000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers
      }
    });

    await this.establishConnection();
  }

  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    this.cleanup();
    this.handleDisconnect();
  }

  async send(message: MCPTransportMessage): Promise<void> {
    if (!this.httpClient || !this._connected) {
      throw new Error("Transport not connected");
    }

    try {
      await this.httpClient.post("/rpc", message);
    } catch (error) {
      this.handleError(new Error(`Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`));
      throw error;
    }
  }

  async *stream(method: string, params?: any): AsyncIterable<any> {
    if (!this.httpClient || !this._connected) {
      throw new Error("Transport not connected");
    }

    const streamId = this.generateRequestId();
    const message: MCPTransportMessage = {
      id: streamId,
      method,
      params,
      jsonrpc: "2.0"
    };

    const results: any[] = [];
    let finished = false;
    let streamError: Error | null = null;

    const handleStreamMessage = (msg: MCPTransportMessage) => {
      if (msg.id === streamId) {
        if (msg.error) {
          streamError = new Error(`Stream error: ${msg.error.message}`);
          finished = true;
        } else if (msg.result?.done) {
          finished = true;
        } else if (msg.result?.data) {
          results.push(msg.result.data);
        }
      }
    };

    this.on("message", handleStreamMessage);

    try {
      await this.httpClient.post("/stream", message);

      while (!finished) {
        if (streamError) {
          throw streamError;
        }
        if (results.length > 0) {
          yield results.shift();
        } else {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Yield any remaining results
      while (results.length > 0) {
        yield results.shift();
      }
    } finally {
      this.off("message", handleStreamMessage);
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `${this.config!.baseURL}/events?client=${this.id}`;
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.onopen = () => {
          this.reconnectAttempts = 0;
          this.handleConnect();
          this.startHeartbeat();
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          try {
            const message: MCPTransportMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            this.handleError(new Error(`Invalid SSE message: ${event.data}`));
          }
        };

        this.eventSource.onerror = (error) => {
          if (this._connected) {
            this.handleError(new Error("SSE connection error"));
            this.attemptReconnect();
          } else {
            reject(new Error("Failed to establish SSE connection"));
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (!this._connected) {
            reject(new Error("SSE connection timeout"));
          }
        }, this.config!.timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config!.maxReconnectAttempts!) {
      this.handleError(new Error("Max reconnection attempts reached"));
      this.handleDisconnect();
      return;
    }

    this.reconnectAttempts++;
    this.cleanup(false);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.establishConnection();
      } catch (error) {
        this.handleError(new Error(`Reconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`));
        this.attemptReconnect();
      }
    }, this.config!.reconnectInterval);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this._connected && this.httpClient) {
        this.httpClient.post("/heartbeat", { clientId: this.id }).catch((error) => {
          this.handleError(new Error(`Heartbeat failed: ${error instanceof Error ? error.message : "Unknown error"}`));
        });
      }
    }, this.config!.heartbeatInterval);
  }

  private cleanup(clearTimers: boolean = true): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (clearTimers) {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }

    this.httpClient = null;
    this.config = null;
    this.reconnectAttempts = 0;
  }
}