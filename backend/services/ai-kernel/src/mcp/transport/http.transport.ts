import axios, { AxiosInstance, AxiosResponse } from "axios";
import { BaseTransport } from "./base.transport";
import { MCPTransportConfig, MCPTransportMessage } from "./transport.interface";

export interface HTTPTransportConfig extends MCPTransportConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class HTTPTransport extends BaseTransport {
  private client: AxiosInstance | null = null;
  private config: HTTPTransportConfig | null = null;

  constructor(id: string) {
    super(id, "http");
  }

  async connect(config: HTTPTransportConfig): Promise<void> {
    if (this._connected) {
      throw new Error("Already connected");
    }

    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        ...this.config.headers,
      },
    });

    // Add retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        if (!config || !config._retryCount) {
          config._retryCount = 0;
        }

        if (
          config._retryCount < this.config!.retries! &&
          this.isRetriableError(error)
        ) {
          config._retryCount++;
          await this.delay(this.config!.retryDelay! * config._retryCount);
          return this.client!.request(config);
        }

        return Promise.reject(error);
      },
    );

    // Test connection
    try {
      await this.client.get("/health", { timeout: 5000 });
      this.handleConnect();
    } catch (error) {
      throw new Error(
        `Failed to connect to ${this.config.baseURL}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this._connected) {
      return;
    }

    this.client = null;
    this.config = null;
    this.handleDisconnect();
  }

  async send(message: MCPTransportMessage): Promise<void> {
    if (!this.client || !this._connected) {
      throw new Error("Transport not connected");
    }

    try {
      await this.client.post("/rpc", message);
    } catch (error) {
      this.handleError(
        new Error(
          `Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`,
        ),
      );
      throw error;
    }
  }

  async *stream(method: string, params?: any): AsyncIterable<any> {
    if (!this.client || !this._connected) {
      throw new Error("Transport not connected");
    }

    const message: MCPTransportMessage = {
      id: this.generateRequestId(),
      method,
      params,
      jsonrpc: "2.0",
    };

    try {
      const response = await this.client.post("/stream", message, {
        responseType: "stream",
      });

      let buffer = "";
      const stream = response.data;

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.done) {
                return;
              }
              yield data.result;
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error) {
      throw new Error(
        `Stream failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async close(): Promise<void> {
    await this.disconnect();
  }

  private isRetriableError(error: any): boolean {
    if (!error.response) {
      return true; // Network errors
    }

    const status = error.response.status;
    return status >= 500 || status === 429 || status === 408;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
