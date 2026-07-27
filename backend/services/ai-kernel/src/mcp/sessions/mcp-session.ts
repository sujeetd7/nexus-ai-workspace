import { MCPTransport, MCPTransportMessage } from "../transport";
import { MCPConnectionStatus, MCPServerHealth } from "../types";

export enum MCPSessionStatus {
  IDLE = "idle",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  RECONNECTING = "reconnecting",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

export interface MCPSessionConfig {
  serverId: string;
  transport: MCPTransport;
  heartbeatInterval?: number;
  idleTimeout?: number;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export class MCPSession {
  public readonly sessionId: string;
  public readonly serverId: string;
  public readonly connectedAt: Date | null = null;
  public lastHeartbeat: Date | null = null;
  public status: MCPSessionStatus = MCPSessionStatus.IDLE;

  private transport: MCPTransport;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private idleTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private config: Required<MCPSessionConfig>;

  constructor(config: MCPSessionConfig) {
    this.sessionId = `session-${config.serverId}-${Date.now()}`;
    this.serverId = config.serverId;
    this.transport = config.transport;

    this.config = {
      ...config,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      idleTimeout: config.idleTimeout ?? 300000, // 5 minutes
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectInterval: config.reconnectInterval ?? 5000,
    };

    this.setupTransportListeners();
  }

  async connect(): Promise<void> {
    if (this.status === MCPSessionStatus.CONNECTED) {
      throw new Error("Session already connected");
    }

    this.status = MCPSessionStatus.CONNECTING;

    try {
      if (!this.transport.connected) {
        await this.transport.connect({});
      }

      this.status = MCPSessionStatus.CONNECTED;
      (this as any).connectedAt = new Date();
      this.lastHeartbeat = new Date();
      this.reconnectAttempts = 0;

      this.startHeartbeat();
      this.resetIdleTimeout();
    } catch (error) {
      this.status = MCPSessionStatus.ERROR;
      throw new Error(
        `Failed to connect session: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.status === MCPSessionStatus.DISCONNECTED) {
      return;
    }

    this.cleanup();

    try {
      await this.transport.disconnect();
    } catch (error) {
      // Ignore errors during disconnect
    }

    this.status = MCPSessionStatus.DISCONNECTED;
    (this as any).connectedAt = null;
    this.lastHeartbeat = null;
  }

  async heartbeat(): Promise<MCPServerHealth> {
    if (this.status !== MCPSessionStatus.CONNECTED) {
      throw new Error("Session not connected");
    }

    try {
      const health = await this.transport.health();
      this.lastHeartbeat = new Date();
      this.resetIdleTimeout();
      return health;
    } catch (error) {
      this.handleHeartbeatFailure();
      throw error;
    }
  }

  async request(method: string, params?: any, timeout?: number): Promise<any> {
    if (this.status !== MCPSessionStatus.CONNECTED) {
      throw new Error("Session not connected");
    }

    try {
      const result = await this.transport.request(method, params, timeout);
      this.resetIdleTimeout();
      return result;
    } catch (error) {
      this.handleRequestFailure(error);
      throw error;
    }
  }

  async *stream(method: string, params?: any): AsyncIterable<any> {
    if (this.status !== MCPSessionStatus.CONNECTED) {
      throw new Error("Session not connected");
    }

    try {
      for await (const item of this.transport.stream(method, params)) {
        this.resetIdleTimeout();
        yield item;
      }
    } catch (error) {
      this.handleStreamFailure(error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return (
      this.status === MCPSessionStatus.CONNECTED &&
      this.lastHeartbeat !== null &&
      Date.now() - this.lastHeartbeat.getTime() <
        this.config.heartbeatInterval * 2
    );
  }

  shouldReconnect(): boolean {
    return (
      this.status === MCPSessionStatus.ERROR &&
      this.reconnectAttempts < this.config.maxReconnectAttempts
    );
  }

  async attemptReconnect(): Promise<void> {
    if (!this.shouldReconnect()) {
      throw new Error("Reconnection not allowed");
    }

    this.status = MCPSessionStatus.RECONNECTING;
    this.reconnectAttempts++;

    try {
      await this.transport.close();
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.reconnectInterval),
      );
      await this.connect();
    } catch (error) {
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this.status = MCPSessionStatus.ERROR;
        throw new Error(
          `Max reconnection attempts reached: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
      throw error;
    }
  }

  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      serverId: this.serverId,
      status: this.status,
      connectedAt: this.connectedAt,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts,
      isHealthy: this.isHealthy(),
      transportType: this.transport.type,
      transportConnected: this.transport.connected,
    };
  }

  private setupTransportListeners(): void {
    this.transport.on("disconnect", () => {
      if (this.status === MCPSessionStatus.CONNECTED) {
        this.status = MCPSessionStatus.ERROR;
        this.cleanup();
      }
    });

    this.transport.on("error", (error: Error) => {
      if (this.status === MCPSessionStatus.CONNECTED) {
        this.status = MCPSessionStatus.ERROR;
      }
    });

    this.transport.on("connect", () => {
      if (this.status === MCPSessionStatus.RECONNECTING) {
        this.status = MCPSessionStatus.CONNECTED;
        this.startHeartbeat();
        this.resetIdleTimeout();
      }
    });
  }

  private startHeartbeat(): void {
    this.cleanup();

    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.heartbeat();
      } catch (error) {
        // Heartbeat failure is handled in heartbeat() method
      }
    }, this.config.heartbeatInterval);
  }

  private resetIdleTimeout(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.config.idleTimeout);
  }

  private handleHeartbeatFailure(): void {
    this.status = MCPSessionStatus.ERROR;
    this.cleanup();
  }

  private handleRequestFailure(error: any): void {
    if (error instanceof Error && error.message.includes("not connected")) {
      this.status = MCPSessionStatus.ERROR;
    }
  }

  private handleStreamFailure(error: any): void {
    if (error instanceof Error && error.message.includes("not connected")) {
      this.status = MCPSessionStatus.ERROR;
    }
  }

  private handleIdleTimeout(): void {
    this.status = MCPSessionStatus.ERROR;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
