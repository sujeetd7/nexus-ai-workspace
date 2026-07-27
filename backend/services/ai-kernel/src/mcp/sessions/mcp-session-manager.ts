import { MCPSession, MCPSessionConfig, MCPSessionStatus } from "./mcp-session";
import { MCPTransport } from "../transport";

export interface SessionManagerConfig {
  healthCheckInterval?: number;
  reconnectInterval?: number;
  maxConcurrentSessions?: number;
  sessionTimeout?: number;
}

export interface SessionInfo {
  sessionId: string;
  serverId: string;
  status: MCPSessionStatus;
  connectedAt: Date | null;
  lastHeartbeat: Date | null;
  isHealthy: boolean;
  transportType: string;
}

export class MCPSessionManager {
  private sessions = new Map<string, MCPSession>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private config: Required<SessionManagerConfig>;
  private shuttingDown: boolean = false;

  constructor(config: SessionManagerConfig = {}) {
    this.config = {
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      reconnectInterval: config.reconnectInterval ?? 10000,
      maxConcurrentSessions: config.maxConcurrentSessions ?? 50,
      sessionTimeout: config.sessionTimeout ?? 300000, // 5 minutes
    };

    this.startHealthCheck();
    this.startReconnectMonitor();
  }

  async create(
    serverId: string,
    transport: MCPTransport,
    sessionConfig?: Partial<MCPSessionConfig>,
  ): Promise<MCPSession> {
    if (this.shuttingDown) {
      throw new Error("Session manager is shutting down");
    }

    if (this.sessions.size >= this.config.maxConcurrentSessions) {
      throw new Error("Maximum concurrent sessions reached");
    }

    // Check if session already exists for this server
    const existingSession = this.getByServerId(serverId);
    if (
      existingSession &&
      existingSession.status === MCPSessionStatus.CONNECTED
    ) {
      throw new Error(`Active session already exists for server ${serverId}`);
    }

    const config: MCPSessionConfig = {
      serverId,
      transport,
      heartbeatInterval: sessionConfig?.heartbeatInterval ?? 30000,
      idleTimeout: sessionConfig?.idleTimeout ?? this.config.sessionTimeout,
      maxReconnectAttempts: sessionConfig?.maxReconnectAttempts ?? 5,
      reconnectInterval:
        sessionConfig?.reconnectInterval ?? this.config.reconnectInterval,
    };

    const session = new MCPSession(config);
    this.sessions.set(session.sessionId, session);

    try {
      await session.connect();
      return session;
    } catch (error) {
      this.sessions.delete(session.sessionId);
      throw error;
    }
  }

  get(sessionId: string): MCPSession | null {
    return this.sessions.get(sessionId) || null;
  }

  getByServerId(serverId: string): MCPSession | null {
    for (const session of this.sessions.values()) {
      if (session.serverId === serverId) {
        return session;
      }
    }
    return null;
  }

  async remove(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      await session.disconnect();
    } catch (error) {
      // Ignore errors during cleanup
    }

    return this.sessions.delete(sessionId);
  }

  async removeByServerId(serverId: string): Promise<boolean> {
    const session = this.getByServerId(serverId);
    if (!session) {
      return false;
    }

    return this.remove(session.sessionId);
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.stopMonitors();

    const disconnectPromises = Array.from(this.sessions.values()).map(
      async (session) => {
        try {
          await session.disconnect();
        } catch (error) {
          // Ignore errors during shutdown
        }
      },
    );

    await Promise.allSettled(disconnectPromises);
    this.sessions.clear();
  }

  async heartbeatAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    const heartbeatPromises = Array.from(this.sessions.entries()).map(
      async ([sessionId, session]) => {
        if (session.status === MCPSessionStatus.CONNECTED) {
          try {
            await session.heartbeat();
            results[sessionId] = true;
          } catch (error) {
            results[sessionId] = false;
          }
        } else {
          results[sessionId] = false;
        }
      },
    );

    await Promise.allSettled(heartbeatPromises);
    return results;
  }

  async reconnectDeadSessions(): Promise<string[]> {
    const reconnected: string[] = [];

    const reconnectPromises = Array.from(this.sessions.values()).map(
      async (session) => {
        if (session.shouldReconnect()) {
          try {
            await session.attemptReconnect();
            reconnected.push(session.sessionId);
          } catch (error) {
            // If max attempts reached, remove the session
            if (
              session.status === MCPSessionStatus.ERROR &&
              !session.shouldReconnect()
            ) {
              this.sessions.delete(session.sessionId);
            }
          }
        }
      },
    );

    await Promise.allSettled(reconnectPromises);
    return reconnected;
  }

  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map((session) => {
      const info = session.getSessionInfo();
      return {
        sessionId: info.sessionId,
        serverId: info.serverId,
        status: info.status,
        connectedAt: info.connectedAt,
        lastHeartbeat: info.lastHeartbeat,
        isHealthy: info.isHealthy,
        transportType: info.transportType,
      };
    });
  }

  getHealthySessions(): MCPSession[] {
    return Array.from(this.sessions.values()).filter((session) =>
      session.isHealthy(),
    );
  }

  getUnhealthySessions(): MCPSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => !session.isHealthy(),
    );
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getSessionsByStatus(status: MCPSessionStatus): MCPSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.status === status,
    );
  }

  async cleanupTimedOutSessions(): Promise<string[]> {
    const timedOut: string[] = [];
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      const info = session.getSessionInfo();

      // Check if session is timed out
      if (info.lastHeartbeat) {
        const timeSinceLastHeartbeat = now - info.lastHeartbeat.getTime();
        if (timeSinceLastHeartbeat > this.config.sessionTimeout) {
          try {
            await session.disconnect();
            this.sessions.delete(sessionId);
            timedOut.push(sessionId);
          } catch (error) {
            // Ignore errors during cleanup
          }
        }
      } else if (info.connectedAt) {
        const timeSinceConnection = now - info.connectedAt.getTime();
        if (timeSinceConnection > this.config.sessionTimeout) {
          try {
            await session.disconnect();
            this.sessions.delete(sessionId);
            timedOut.push(sessionId);
          } catch (error) {
            // Ignore errors during cleanup
          }
        }
      }
    }

    return timedOut;
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(async () => {
      if (!this.shuttingDown) {
        try {
          await this.heartbeatAll();
          await this.cleanupTimedOutSessions();
        } catch (error) {
          // Continue health checks despite errors
        }
      }
    }, this.config.healthCheckInterval);
  }

  private startReconnectMonitor(): void {
    this.reconnectTimer = setInterval(async () => {
      if (!this.shuttingDown) {
        try {
          await this.reconnectDeadSessions();
        } catch (error) {
          // Continue reconnect attempts despite errors
        }
      }
    }, this.config.reconnectInterval);
  }

  private stopMonitors(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
